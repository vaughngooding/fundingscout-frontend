// supabase/functions/send-webhooks/index.ts
// Supabase Edge Function: multi-channel notification dispatcher.
// Sends real-time alerts via Slack (webhook or app), Teams, Telegram, Web Push,
// and SMS for FundingScout Pro users when new user_alerts are created.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Web Push: use the npm package via esm.sh to get a proper RFC 8291 implementation.
// The previous hand-rolled VAPID JWT + plaintext-payload approach was broken because
// payloads must be aes128gcm-encrypted with the subscription's keys (which the dispatcher
// was claiming via header but not actually doing). Push services silently rejected every
// attempt. The web-push package handles encryption + VAPID signing in one call.
import webpush from 'https://esm.sh/web-push@3.6.7?target=denonext'

// ---------------------------------------------------------------------------
// Types (mirrored from src/lib/types.ts for Deno compatibility)
// ---------------------------------------------------------------------------

interface FundingRound {
  id: string
  company_name: string
  website: string | null
  location: string | null
  location_country: string | null
  amount_usd: number
  funding_type: string
  investors: string[]
  lead_investor: string | null
  industry: string | null
  industry_tags: string[]
  confidence_score: number
  article_url: string
  article_title: string | null
  source_feed: string | null
  published_date: string | null
  created_at: string
  // Phase 6: enrichment fields (CEO + website source tracking)
  ceo_name: string | null
  // Phase 7: Kirha/Apollo CEO contact enrichment
  ceo_email: string | null
  ceo_linkedin_url: string | null
  ceo_email_source: string | null
  enrichment_attempted_at: string | null
}

interface PendingAlert {
  id: string
  user_id: string
  funding_round_id: string
  status: string
  funding_round: FundingRound
  profile: {
    id: string
    email: string
    full_name: string | null
    plan: string
  }
}

interface UserPreference {
  user_id: string
  slack_webhook_url: string | null
  teams_webhook_url: string | null
  // Phase 1: Telegram
  telegram_chat_id: number | null
  // Phase 2: Web Push
  push_subscription: { endpoint: string; keys: { p256dh: string; auth: string } } | null
  // Phase 3: SMS
  phone_number: string | null
  phone_verified: boolean
  // Phase 4: Slack App
  slack_bot_token: string | null
  slack_channel_id: string | null
  slack_app_installed: boolean
  // Phase 5: Email-to-channel relay (for enterprise users who can't install
  // custom Slack/Teams apps). Both Slack and Teams expose a per-channel
  // email address that posts the email body into the channel — we just
  // dispatch via Resend to that address.
  slack_channel_email: string | null
  teams_channel_email: string | null
}

// ---------------------------------------------------------------------------
// Delivery counters
// ---------------------------------------------------------------------------

interface DeliveryStats {
  slack_sent: number
  teams_sent: number
  telegram_sent: number
  push_sent: number
  sms_sent: number
  slack_app_sent: number
  channel_email_sent: number
}

// ---------------------------------------------------------------------------
// Helpers – formatting
// ---------------------------------------------------------------------------

function formatAmount(amountUsd: number): string {
  if (amountUsd >= 1_000_000_000) return `$${(amountUsd / 1_000_000_000).toFixed(1)}B`
  if (amountUsd >= 1_000_000) return `$${(amountUsd / 1_000_000).toFixed(1)}M`
  if (amountUsd >= 1_000) return `$${(amountUsd / 1_000).toFixed(0)}K`
  return `$${amountUsd.toLocaleString()}`
}

function formatAmountLong(amountUsd: number): string {
  if (amountUsd >= 1_000_000_000) return `$${(amountUsd / 1_000_000_000).toFixed(1)} billion`
  if (amountUsd >= 1_000_000) return `$${(amountUsd / 1_000_000).toFixed(1)} million`
  if (amountUsd >= 1_000) return `$${(amountUsd / 1_000).toFixed(0)} thousand`
  return `$${amountUsd.toLocaleString()}`
}

// ---------------------------------------------------------------------------
// Slack Block Kit message builder (webhook)
// ---------------------------------------------------------------------------

function buildSlackWebhookPayload(round: FundingRound) {
  const amount = formatAmount(round.amount_usd)
  const investors =
    round.investors && round.investors.length > 0
      ? round.investors.join(', ')
      : 'Undisclosed'
  const location = round.location || round.location_country || 'Unknown'

  const fields: Array<{ type: string; text: string }> = [
    { type: 'mrkdwn', text: `*Amount:*\n${amount}` },
    { type: 'mrkdwn', text: `*Round:*\n${round.funding_type}` },
    { type: 'mrkdwn', text: `*Location:*\n${location}` },
    { type: 'mrkdwn', text: `*Investors:*\n${investors}` },
  ]

  const blocks: Array<Record<string, unknown>> = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Funding Alert: ${round.company_name}`,
        emoji: true,
      },
    },
    { type: 'section', fields },
  ]

  // Phase 7: CEO contact card (Kirha/Apollo enrichment)
  const ceoContext = buildCeoContextLine(round)
  if (ceoContext) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: ceoContext }],
    })
  }

  if (round.industry || (round.industry_tags && round.industry_tags.length > 0)) {
    const tags = round.industry_tags?.length > 0 ? round.industry_tags.join(', ') : round.industry
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `*Industry:* ${tags}` }],
    })
  }

  if (round.article_url) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Read Article', emoji: true },
          url: round.article_url,
          action_id: 'read_article',
        },
      ],
    })
  }

  blocks.push({ type: 'divider' })
  return { blocks }
}

// Phase 7: Shared helper for the CEO • email • LinkedIn line.
// Returns Slack mrkdwn formatted string, or null if no enrichment data.
function buildCeoContextLine(round: FundingRound): string | null {
  const parts: string[] = []
  if (round.ceo_name) {
    parts.push(`*CEO:* ${round.ceo_name}`)
  }
  if (round.ceo_email) {
    parts.push(`<mailto:${round.ceo_email}|${round.ceo_email}>`)
  }
  if (round.ceo_linkedin_url) {
    parts.push(`<${round.ceo_linkedin_url}|LinkedIn>`)
  }
  return parts.length > 0 ? parts.join(' • ') : null
}

// ---------------------------------------------------------------------------
// Slack App Block Kit builder (chat.postMessage with interactive buttons)
// ---------------------------------------------------------------------------

function buildSlackAppPayload(round: FundingRound, alertId: string) {
  const amount = formatAmount(round.amount_usd)
  const investors =
    round.investors && round.investors.length > 0
      ? round.investors.join(', ')
      : 'Undisclosed'
  const location = round.location || round.location_country || 'Unknown'

  const blocks: Array<Record<string, unknown>> = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Funding Alert: ${round.company_name}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Amount:*\n${amount}` },
        { type: 'mrkdwn', text: `*Round:*\n${round.funding_type}` },
        { type: 'mrkdwn', text: `*Location:*\n${location}` },
        { type: 'mrkdwn', text: `*Investors:*\n${investors}` },
      ],
    },
  ]

  // Phase 7: CEO contact card
  const ceoContextApp = buildCeoContextLine(round)
  if (ceoContextApp) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: ceoContextApp }],
    })
  }

  if (round.industry || (round.industry_tags && round.industry_tags.length > 0)) {
    const tags = round.industry_tags?.length > 0 ? round.industry_tags.join(', ') : round.industry
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `*Industry:* ${tags}` }],
    })
  }

  // Interactive actions: View Article, Bookmark, Dismiss
  blocks.push({
    type: 'actions',
    block_id: `alert_${alertId}`,
    elements: [
      ...(round.article_url
        ? [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Read Article', emoji: true },
              url: round.article_url,
              action_id: 'view_article',
            },
          ]
        : []),
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Bookmark', emoji: true },
        action_id: 'bookmark_alert',
        value: alertId,
        style: 'primary',
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Dismiss', emoji: true },
        action_id: 'dismiss_alert',
        value: alertId,
      },
    ],
  })

  blocks.push({ type: 'divider' })
  return { blocks }
}

// ---------------------------------------------------------------------------
// Teams MessageCard builder
// ---------------------------------------------------------------------------

function buildTeamsPayload(round: FundingRound) {
  const amount = formatAmount(round.amount_usd)
  const amountLong = formatAmountLong(round.amount_usd)
  const location = round.location || round.location_country || 'Unknown'

  const facts: Array<{ name: string; value: string }> = [
    { name: 'Amount', value: amountLong },
    { name: 'Location', value: location },
    { name: 'Funding Type', value: round.funding_type },
  ]

  if (round.website) facts.push({ name: 'Website', value: round.website })
  // Phase 7: CEO contact enrichment (Kirha/Apollo)
  if (round.ceo_name) facts.push({ name: 'CEO', value: round.ceo_name })
  if (round.ceo_email) facts.push({ name: 'CEO Email', value: round.ceo_email })
  if (round.ceo_linkedin_url) facts.push({ name: 'CEO LinkedIn', value: round.ceo_linkedin_url })
  if (round.investors?.length > 0) facts.push({ name: 'Investors', value: round.investors.join(', ') })
  if (round.lead_investor) facts.push({ name: 'Lead Investor', value: round.lead_investor })
  if (round.industry) facts.push({ name: 'Industry', value: round.industry })

  const card: Record<string, unknown> = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '0076D7',
    summary: `Funding Alert: ${round.company_name}`,
    sections: [
      {
        activityTitle: `${round.company_name} raises ${amount}`,
        activitySubtitle: `${round.funding_type} Round`,
        facts,
        markdown: true,
      },
    ],
  }

  if (round.article_url) {
    card.potentialAction = [
      {
        '@type': 'OpenUri',
        name: 'Read Full Article',
        targets: [{ os: 'default', uri: round.article_url }],
      },
    ]
  }

  return card
}

// ---------------------------------------------------------------------------
// Telegram HTML message builder
// ---------------------------------------------------------------------------

function buildTelegramPayload(round: FundingRound) {
  const amount = formatAmount(round.amount_usd)
  const location = round.location || round.location_country || 'Unknown'
  const investors =
    round.investors && round.investors.length > 0
      ? round.investors.join(', ')
      : 'Undisclosed'

  // Phase 6: enrichment fields. Show "Unknown" for missing values IF
  // we attempted enrichment, otherwise omit the line entirely (for
  // pre-enrichment historical rounds that haven't been backfilled).
  const tried = !!round.enrichment_attempted_at
  const ceoLabel = round.ceo_name || (tried ? 'Unknown' : '')
  const websiteRaw = round.website || ''
  const websiteDisplay = websiteRaw
    ? websiteRaw.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : (tried ? 'Unknown' : '')

  let text = `<b>Funding Alert: ${escapeHtml(round.company_name)}</b>\n\n`
  text += `<b>Amount:</b> ${amount}\n`
  text += `<b>Round:</b> ${escapeHtml(round.funding_type)}\n`
  text += `<b>Location:</b> ${escapeHtml(location)}\n`
  if (ceoLabel) {
    // Phase 7: if we have a verified Apollo email, show it inline with the CEO.
    // Also link LinkedIn URL when available.
    if (round.ceo_email) {
      text += `<b>CEO:</b> ${escapeHtml(ceoLabel)} (<a href="mailto:${escapeHtml(round.ceo_email)}">${escapeHtml(round.ceo_email)}</a>)\n`
    } else if (round.ceo_linkedin_url) {
      text += `<b>CEO:</b> <a href="${escapeHtml(round.ceo_linkedin_url)}">${escapeHtml(ceoLabel)}</a>\n`
    } else {
      text += `<b>CEO:</b> ${escapeHtml(ceoLabel)}\n`
    }
  }
  if (websiteDisplay) {
    if (websiteRaw) {
      text += `<b>Website:</b> <a href="${escapeHtml(websiteRaw)}">${escapeHtml(websiteDisplay)}</a>\n`
    } else {
      text += `<b>Website:</b> ${escapeHtml(websiteDisplay)}\n`
    }
  }
  text += `<b>Investors:</b> ${escapeHtml(investors)}\n`

  if (round.industry) {
    text += `<b>Industry:</b> ${escapeHtml(round.industry)}\n`
  }

  // Inline keyboard button for article link
  const reply_markup = round.article_url
    ? {
        inline_keyboard: [
          [{ text: 'Read Article', url: round.article_url }],
        ],
      }
    : undefined

  return { text, reply_markup }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ---------------------------------------------------------------------------
// Web Push payload builder
// ---------------------------------------------------------------------------

function buildWebPushPayload(round: FundingRound) {
  return {
    title: `Funding Alert: ${round.company_name}`,
    body: `${formatAmount(round.amount_usd)} ${round.funding_type}`,
    url: round.article_url || 'https://fundingscout.io',
    tag: `funding-${round.id}`,
  }
}

// ---------------------------------------------------------------------------
// SMS message builder (<160 chars)
// ---------------------------------------------------------------------------

function buildSmsBody(round: FundingRound): string {
  const amount = formatAmount(round.amount_usd)
  const url = round.article_url || ''
  return `FundingScout: ${round.company_name} raised ${amount} (${round.funding_type}). ${url}`.slice(0, 160)
}

// ---------------------------------------------------------------------------
// Generic HTTP sender
// ---------------------------------------------------------------------------

async function sendWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.text()
    return { ok: response.ok, status: response.status, body }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, status: 0, body: message }
  }
}

// ---------------------------------------------------------------------------
// Channel dispatchers
// ---------------------------------------------------------------------------

async function sendTelegram(
  chatId: number,
  round: FundingRound,
): Promise<{ ok: boolean; error?: string }> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set' }

  const { text, reply_markup } = buildTelegramPayload(round)
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  round: FundingRound,
): Promise<{ ok: boolean; error?: string }> {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { ok: false, error: 'VAPID keys not set' }
  }

  // Configure VAPID once per call (idempotent + safe across cold starts).
  webpush.setVapidDetails(
    'mailto:alerts@fundingscout.io',
    vapidPublicKey,
    vapidPrivateKey,
  )

  const payload = JSON.stringify(buildWebPushPayload(round))

  try {
    // web-push handles aes128gcm encryption with the subscription's
    // p256dh + auth keys per RFC 8291, sets all the right headers, and
    // signs the VAPID JWT. The previous hand-rolled implementation
    // skipped encryption entirely and silently failed.
    await webpush.sendNotification(subscription, payload, {
      TTL: 86400,
      urgency: 'high',
    })
    return { ok: true }
  } catch (error: unknown) {
    // web-push throws WebPushError for HTTP failures from the push service.
    const err = error as { statusCode?: number; body?: string; message?: string }
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { ok: false, error: `Subscription expired (${err.statusCode})` }
    }
    const msg = err.body || err.message || String(error)
    return { ok: false, error: `${err.statusCode || ''} ${msg}`.trim() }
  }
}

async function sendSms(
  phoneNumber: string,
  round: FundingRound,
): Promise<{ ok: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'Twilio credentials not set' }
  }

  const body = buildSmsBody(round)
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  // NOTE: Raw Twilio SMS is intentionally disabled in v1 — TWILIO_FROM_NUMBER is unset
  // so the early-return above (`return { ok: false, error: 'Twilio credentials not set' }`)
  // skips this branch. Will be re-enabled post-launch once A2P 10DLC clears.

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: fromNumber,
        Body: body,
      }).toString(),
    })

    if (!res.ok) {
      const errBody = await res.text()
      return { ok: false, error: `${res.status}: ${errBody}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ---------------------------------------------------------------------------
// Email-to-channel: relays a funding alert via Resend to a Slack or Teams
// channel-specific email address. Used by enterprise users who can't install
// custom Slack/Teams apps because their workspace requires admin approval.
//
// Slack: channel → Settings → Integrations → "Send emails to this channel"
//   → generates `channel-name-abc123@yourcompany.slack.com`
// Teams: channel → ... menu → "Get email address"
//   → generates `Channel Name - Workspace <id>@amer.teams.ms`
// ---------------------------------------------------------------------------

function buildChannelEmail(round: FundingRound): { subject: string; html: string; text: string } {
  const amount = formatAmount(round.amount_usd)
  const type = formatFundingType(round.funding_type)
  const company = round.company_name
  const url = round.article_url || ''
  const location = round.location || ''
  const country = round.location_country || ''
  const lead = round.lead_investor || ''
  const tags = (round.industry_tags || []).join(' • ')
  // Phase 6: enrichment fields. Display "Unknown" when missing IF we tried
  // (enrichment_attempted_at is set), otherwise omit the line entirely.
  const tried = !!round.enrichment_attempted_at
  const ceoLabel = round.ceo_name || (tried ? 'Unknown' : '')
  const websiteRaw = round.website || ''
  const websiteDisplay = websiteRaw
    ? websiteRaw.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : (tried ? 'Unknown' : '')

  const subject = `🚀 ${company} raised ${amount} (${type})`

  const text = [
    `${company} raised ${amount} (${type})`,
    location ? `📍 ${location}${country ? `, ${country}` : ''}` : '',
    ceoLabel ? `👤 CEO: ${ceoLabel}` : '',
    websiteDisplay ? `🌐 Website: ${websiteDisplay}` : '',
    lead ? `💼 Led by ${lead}` : '',
    tags ? `🏷️ ${tags}` : '',
    '',
    url,
    '',
    '— FundingScout (alerts matching your saved filters). Manage at https://fundingscout.io/settings',
  ]
    .filter(Boolean)
    .join('\n')

  // Build HTML versions of CEO + website rows. Website becomes a real link
  // when present; "Unknown" stays as plain text.
  const ceoHtml = ceoLabel
    ? `<div style="margin-bottom:6px;color:#475569;">👤 CEO: <strong>${ceoLabel}</strong></div>`
    : ''
  const websiteHtml = websiteRaw
    ? `<div style="margin-bottom:6px;color:#475569;">🌐 <a href="${websiteRaw}" style="color:#0369a1;text-decoration:none;">${websiteDisplay}</a></div>`
    : (tried
      ? `<div style="margin-bottom:6px;color:#475569;">🌐 Website: <span style="color:#94a3b8;font-style:italic;">Unknown</span></div>`
      : '')

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;color:#0f172a;">
  <div style="font-size:13px;color:#10b981;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px;">FundingScout · New funding alert</div>
  <h2 style="margin:0 0 6px 0;font-size:22px;color:#0f172a;">${company}</h2>
  <div style="font-size:28px;font-weight:800;color:#059669;margin-bottom:14px;">${amount}<span style="font-size:14px;font-weight:600;color:#64748b;margin-left:8px;">${type}</span></div>
  ${location ? `<div style="margin-bottom:6px;color:#475569;">📍 ${location}${country ? `, ${country}` : ''}</div>` : ''}
  ${ceoHtml}
  ${websiteHtml}
  ${lead ? `<div style="margin-bottom:6px;color:#475569;">💼 Led by <strong>${lead}</strong></div>` : ''}
  ${tags ? `<div style="margin-bottom:6px;color:#475569;">🏷️ ${tags}</div>` : ''}
  <div style="margin-top:18px;">
    <a href="${url}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:14px;">Read article →</a>
  </div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
  <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
    Sent by FundingScout because this funding round matched your saved alert filters.
    <br>
    <a href="https://fundingscout.io/settings" style="color:#94a3b8;">Manage filters</a> · <a href="https://fundingscout.io/sms" style="color:#94a3b8;">About</a>
  </div>
</div>`.trim()

  return { subject, html, text }
}

async function sendChannelEmail(
  toEmail: string,
  round: FundingRound,
): Promise<{ ok: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    return { ok: false, error: 'RESEND_API_KEY not set' }
  }

  const { subject, html, text } = buildChannelEmail(round)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FundingScout <alerts@fundingscout.io>',
        to: [toEmail],
        subject,
        html,
        text,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      return { ok: false, error: `${res.status}: ${errBody}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function sendSlackApp(
  botToken: string,
  channelId: string,
  round: FundingRound,
  alertId: string,
): Promise<{ ok: boolean; error?: string }> {
  const payload = buildSlackAppPayload(round, alertId)

  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        blocks: payload.blocks,
        text: `Funding Alert: ${round.company_name} raised ${formatAmount(round.amount_usd)}`,
      }),
    })

    const data = await res.json()
    if (!data.ok) {
      return { ok: false, error: data.error || 'Unknown Slack API error' }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Public API match dispatch — see /api/v1/* routes in the Next.js app.
//
// Keep these helpers in sync with src/lib/api-domain.ts. The match logic
// is duplicated rather than imported across the Next.js/Deno boundary
// because edge functions can't import from the Next.js src tree.
// ---------------------------------------------------------------------------

const API_COMPANY_SUFFIX_RE =
  /[,.]?\s*(Inc|LLC|L\.L\.C\.|Corp|Corporation|Ltd|Limited|Co|Company|Holdings|Group|LP|L\.P\.|PLC|SA|GmbH|AG|NV|BV)\.?\s*$/gi

function apiNormalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null
  let s = String(input).trim().toLowerCase()
  if (!s) return null
  s = s.replace(/^https?:\/\//, '')
  s = s.split('/')[0].split('?')[0].split('#')[0]
  s = s.replace(/^www\./, '').replace(/\.+$/, '')
  if (!s.includes('.')) return null
  if (/\s/.test(s) || s.includes('@')) return null
  return s
}

function apiNormalizeName(input: string | null | undefined): string {
  if (!input) return ''
  let n = String(input).trim().toLowerCase()
  for (let i = 0; i < 5; i++) {
    const next = n.replace(API_COMPANY_SUFFIX_RE, '').trim().replace(/[,.\s]+$/, '')
    if (next === n) break
    n = next
  }
  n = n.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  return n
}

const API_FREE_EMAIL_DOMAINS = new Set<string>([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'live.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com', 'protonmail.com',
  'proton.me', 'pm.me', 'mail.com', 'gmx.com', 'gmx.us', 'zoho.com', 'fastmail.com',
])

interface MatchCandidate {
  user_id: string
  contact_id: string | null
  account_id: string | null
  match_type: 'account_domain' | 'email_domain' | 'account_name'
}

async function dispatchApiMatches(
  supabase: ReturnType<typeof createClient>,
): Promise<{ matched: number; delivered: number; failed: number; no_webhook: number }> {
  const stats = { matched: 0, delivered: 0, failed: 0, no_webhook: 0 }

  // Get funding_rounds from the last 24h. The unique constraint on
  // crm_match_notifications(user_id, funding_round_id) makes re-scanning safe.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentRounds, error: roundsErr } = await supabase
    .from('funding_rounds')
    .select(
      'id, company_name, website, amount_usd, funding_type, article_url, article_title, published_date, ceo_name, ceo_email, ceo_linkedin_url, industry, location, location_country, lead_investor, investors, confidence_score',
    )
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)

  if (roundsErr) {
    console.error('crm-match: failed to fetch recent rounds:', roundsErr)
    return stats
  }
  if (!recentRounds || recentRounds.length === 0) return stats

  // Cache webhook URLs + signing secrets per user. One refetch per user per
  // dispatch tick. The signing secret comes from the user's most-recently-
  // created active API key (in practice each user has one key — we pick the
  // newest if multiple, as a stable heuristic).
  interface WebhookConfig {
    url: string | null
    secret: string | null
  }
  const webhookCache = new Map<string, WebhookConfig>()
  async function getWebhookConfig(userId: string): Promise<WebhookConfig> {
    const cached = webhookCache.get(userId)
    if (cached) return cached
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('crm_webhook_url')
      .eq('user_id', userId)
      .maybeSingle()
    const url = (prefs?.crm_webhook_url as string | null) || null
    let secret: string | null = null
    if (url) {
      const { data: keyRow } = await supabase
        .from('fs_api_keys')
        .select('webhook_secret')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .not('webhook_secret', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      secret = (keyRow?.webhook_secret as string | null) || null
    }
    const cfg = { url, secret }
    webhookCache.set(userId, cfg)
    return cfg
  }

  // HMAC-SHA256 signer using Deno's Web Crypto API (no Node crypto in Edge
  // Functions). Returns "sha256=<hex>" to match the format documented at
  // /docs/api/webhooks.
  async function signPayload(secret: string, body: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sigBuf = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(body),
    )
    const hex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return `sha256=${hex}`
  }

  for (const round of recentRounds) {
    const roundDomain = apiNormalizeDomain(round.website as string | null)
    const roundName = apiNormalizeName(round.company_name as string | null)
    if (!roundDomain && !roundName) continue

    // Collect (user_id → best match) entries. Precedence:
    //   account_domain > email_domain > account_name
    const byUser = new Map<string, MatchCandidate>()
    const setIfBetter = (c: MatchCandidate) => {
      const existing = byUser.get(c.user_id)
      if (!existing) return byUser.set(c.user_id, c)
      const order: Record<string, number> = {
        account_domain: 0, email_domain: 1, account_name: 2,
      }
      if (order[c.match_type] < order[existing.match_type]) byUser.set(c.user_id, c)
    }

    // Path 1: account_domain
    if (roundDomain) {
      const { data: byAcctDomain } = await supabase
        .from('crm_accounts')
        .select('id, user_id')
        .eq('normalized_domain', roundDomain)
      for (const r of byAcctDomain || []) {
        setIfBetter({
          user_id: r.user_id as string,
          account_id: r.id as string,
          contact_id: null,
          match_type: 'account_domain',
        })
      }
    }

    // Path 2: contact email_domain (skip free-mail domains)
    if (roundDomain && !API_FREE_EMAIL_DOMAINS.has(roundDomain)) {
      const { data: byEmailDomain } = await supabase
        .from('crm_contacts')
        .select('id, user_id')
        .eq('email_domain', roundDomain)
      for (const r of byEmailDomain || []) {
        setIfBetter({
          user_id: r.user_id as string,
          account_id: null,
          contact_id: r.id as string,
          match_type: 'email_domain',
        })
      }
    }

    // Path 3: account_name (exact normalized match)
    if (roundName) {
      const { data: byAcctName } = await supabase
        .from('crm_accounts')
        .select('id, user_id')
        .eq('normalized_name', roundName)
      for (const r of byAcctName || []) {
        setIfBetter({
          user_id: r.user_id as string,
          account_id: r.id as string,
          contact_id: null,
          match_type: 'account_name',
        })
      }
    }

    if (byUser.size === 0) continue

    for (const m of byUser.values()) {
      const { data: inserted, error: insertErr } = await supabase
        .from('crm_match_notifications')
        .insert({
          user_id: m.user_id,
          contact_id: m.contact_id,
          account_id: m.account_id,
          funding_round_id: round.id as string,
          match_type: m.match_type,
          webhook_status: 'pending',
        })
        .select('id')
        .single()

      if (insertErr) {
        // 23505 = unique violation = already processed in prior tick → skip silently.
        if (insertErr.code !== '23505') {
          console.error('crm-match: insert failed:', insertErr)
        }
        continue
      }
      if (!inserted) continue

      stats.matched++
      const { url: webhookUrl, secret: webhookSecret } = await getWebhookConfig(m.user_id)

      if (!webhookUrl) {
        await supabase
          .from('crm_match_notifications')
          .update({ webhook_status: 'no_webhook' })
          .eq('id', inserted.id)
        stats.no_webhook++
        continue
      }

      const payload = {
        event: 'funding_match',
        match_id: inserted.id,
        match_type: m.match_type,
        matched: {
          account_external_id: null as string | null,
          contact_external_id: null as string | null,
          account_metadata: null as Record<string, unknown> | null,
          contact_metadata: null as Record<string, unknown> | null,
        },
        funding_round: {
          id: round.id,
          company_name: round.company_name,
          amount_usd: round.amount_usd,
          funding_type: round.funding_type,
          website: round.website,
          article_url: round.article_url,
          article_title: round.article_title,
          published_date: round.published_date,
          ceo_name: round.ceo_name,
          ceo_email: round.ceo_email,
          ceo_linkedin_url: round.ceo_linkedin_url,
          industry: round.industry,
          location: round.location,
          location_country: round.location_country,
          lead_investor: round.lead_investor,
          investors: round.investors,
          confidence_score: round.confidence_score,
        },
        timestamp: new Date().toISOString(),
      }

      if (m.account_id) {
        const { data: a } = await supabase
          .from('crm_accounts')
          .select('external_id, metadata')
          .eq('id', m.account_id)
          .single()
        if (a) {
          payload.matched.account_external_id = a.external_id as string
          payload.matched.account_metadata = (a.metadata as Record<string, unknown>) ?? null
        }
      }
      if (m.contact_id) {
        const { data: c } = await supabase
          .from('crm_contacts')
          .select('external_id, metadata')
          .eq('id', m.contact_id)
          .single()
        if (c) {
          payload.matched.contact_external_id = c.external_id as string
          payload.matched.contact_metadata = (c.metadata as Record<string, unknown>) ?? null
        }
      }

      // Serialize once — the signature MUST be computed over the exact bytes
      // we send, so the receiver can recompute and compare.
      const bodyString = JSON.stringify(payload)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'FundingScout-Webhook/1.0',
      }
      if (webhookSecret) {
        headers['X-FundingScout-Signature'] = await signPayload(webhookSecret, bodyString)
      }

      let webhookStatus: 'delivered' | 'failed' = 'failed'
      let responseCode: number | null = null
      let responseBody: string | null = null
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: bodyString,
          signal: controller.signal,
        })
        clearTimeout(timer)
        responseCode = res.status
        const text = await res.text().catch(() => '')
        responseBody = text.slice(0, 500)
        webhookStatus = res.status >= 200 && res.status < 300 ? 'delivered' : 'failed'
      } catch (e) {
        responseBody = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500)
        webhookStatus = 'failed'
      }

      await supabase
        .from('crm_match_notifications')
        .update({
          webhook_status: webhookStatus,
          webhook_response_code: responseCode,
          webhook_response_body: responseBody,
          delivered_at: webhookStatus === 'delivered' ? new Date().toISOString() : null,
        })
        .eq('id', inserted.id)

      if (webhookStatus === 'delivered') stats.delivered++
      else stats.failed++
    }
  }

  return stats
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Create Supabase admin client
    // -----------------------------------------------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // -----------------------------------------------------------------------
    // 2. Fetch pending alerts for Pro users
    // -----------------------------------------------------------------------

    const { data: alerts, error: alertsError } = await supabase
      .from('user_alerts')
      .select(`
        id,
        user_id,
        funding_round_id,
        status,
        funding_round:funding_rounds!inner (
          id,
          company_name,
          website,
          location,
          location_country,
          amount_usd,
          funding_type,
          investors,
          lead_investor,
          industry,
          industry_tags,
          confidence_score,
          article_url,
          article_title,
          source_feed,
          published_date,
          created_at,
          ceo_name,
          ceo_email,
          ceo_linkedin_url,
          ceo_email_source,
          enrichment_attempted_at
        ),
        profile:profiles!inner (
          id,
          email,
          full_name,
          plan
        )
      `)
      .eq('status', 'pending')
      .eq('profile.plan', 'pro')

    if (alertsError) {
      throw new Error(`Failed to fetch pending alerts: ${alertsError.message}`)
    }

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // -----------------------------------------------------------------------
    // 3. Fetch user preferences (all channel fields)
    // -----------------------------------------------------------------------

    const userIds = [...new Set((alerts as unknown as PendingAlert[]).map((a) => a.user_id))]
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select(
        'user_id, slack_webhook_url, teams_webhook_url, telegram_chat_id, push_subscription, phone_number, phone_verified, slack_bot_token, slack_channel_id, slack_app_installed, slack_channel_email, teams_channel_email',
      )
      .in('user_id', userIds)

    if (prefsError) {
      throw new Error(`Failed to fetch user preferences: ${prefsError.message}`)
    }

    const prefsMap = new Map<string, UserPreference>()
    for (const p of (prefs || []) as UserPreference[]) {
      prefsMap.set(p.user_id, p)
    }

    // ----- L5: per-user rate limit -----
    // Final safety net against carpet-bombing. Even if upstream dedup
    // fails and 20 duplicate user_alerts get queued for the same user,
    // this dispatcher refuses to deliver more than RATE_LIMIT_MAX in a
    // RATE_LIMIT_WINDOW_MIN window. Excess alerts wait for the next
    // cron tick (1 min) so the user gets them throttled.
    const RATE_LIMIT_MAX_PER_WINDOW = 5
    const RATE_LIMIT_WINDOW_MIN = 5
    const rateCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString()
    const { data: recentSends } = await supabase
      .from('user_alerts')
      .select('user_id')
      .in('user_id', userIds)
      .eq('status', 'sent')
      .gte('created_at', rateCutoff)
    const recentSendCounts = new Map<string, number>()
    for (const r of (recentSends || []) as Array<{ user_id: string }>) {
      recentSendCounts.set(r.user_id, (recentSendCounts.get(r.user_id) || 0) + 1)
    }
    const rateLimitedUsers = new Set<string>()
    for (const [uid, count] of recentSendCounts.entries()) {
      if (count >= RATE_LIMIT_MAX_PER_WINDOW) {
        rateLimitedUsers.add(uid)
      }
    }

    // -----------------------------------------------------------------------
    // 4. Dispatch to all configured channels per alert
    // -----------------------------------------------------------------------

    const stats: DeliveryStats = {
      slack_sent: 0,
      teams_sent: 0,
      telegram_sent: 0,
      push_sent: 0,
      sms_sent: 0,
      slack_app_sent: 0,
      channel_email_sent: 0,
    }
    const errors: Array<{ alert_id: string; platform: string; error: string }> = []
    const deliveredAlertIds: string[] = []
    let rateLimitedCount = 0

    for (const alert of alerts as unknown as PendingAlert[]) {
      const { funding_round: round } = alert
      const userPrefs = prefsMap.get(alert.user_id)

      if (!round || !userPrefs) continue

      // L5 rate limit: skip users who have already received >= 5 alerts
      // in the last 5 minutes. Also track in-batch sends so a user who
      // hits the cap mid-batch is skipped for subsequent alerts in this run.
      const currentCount = recentSendCounts.get(alert.user_id) || 0
      if (rateLimitedUsers.has(alert.user_id) || currentCount >= RATE_LIMIT_MAX_PER_WINDOW) {
        rateLimitedUsers.add(alert.user_id)
        rateLimitedCount++
        continue
      }

      let anySuccess = false

      // ----- Slack App (takes priority over webhook) -----
      if (userPrefs.slack_app_installed && userPrefs.slack_bot_token && userPrefs.slack_channel_id) {
        try {
          const result = await sendSlackApp(
            userPrefs.slack_bot_token,
            userPrefs.slack_channel_id,
            round,
            alert.id,
          )
          if (result.ok) {
            stats.slack_app_sent++
            anySuccess = true
          } else {
            errors.push({ alert_id: alert.id, platform: 'slack_app', error: result.error || 'Unknown' })
          }
        } catch (e) {
          errors.push({ alert_id: alert.id, platform: 'slack_app', error: String(e) })
        }
      } else if (userPrefs.slack_webhook_url) {
        // ----- Slack Webhook (fallback) -----
        try {
          const payload = buildSlackWebhookPayload(round)
          const result = await sendWebhook(userPrefs.slack_webhook_url, payload)
          if (result.ok) {
            stats.slack_sent++
            anySuccess = true
          } else {
            errors.push({ alert_id: alert.id, platform: 'slack', error: `${result.status}: ${result.body}` })
          }
        } catch (e) {
          errors.push({ alert_id: alert.id, platform: 'slack', error: String(e) })
        }
      }

      // ----- Teams -----
      if (userPrefs.teams_webhook_url) {
        try {
          const payload = buildTeamsPayload(round)
          const result = await sendWebhook(userPrefs.teams_webhook_url, payload)
          if (result.ok) {
            stats.teams_sent++
            anySuccess = true
          } else {
            errors.push({ alert_id: alert.id, platform: 'teams', error: `${result.status}: ${result.body}` })
          }
        } catch (e) {
          errors.push({ alert_id: alert.id, platform: 'teams', error: String(e) })
        }
      }

      // ----- Telegram (Pro-only) -----
      // The outer query already filters profile.plan = 'pro', but we re-check
      // here defensively so a race during a downgrade can't leak alerts.
      if (userPrefs.telegram_chat_id && alert.profile?.plan === 'pro') {
        try {
          const result = await sendTelegram(userPrefs.telegram_chat_id, round)
          if (result.ok) {
            stats.telegram_sent++
            anySuccess = true
          } else {
            errors.push({ alert_id: alert.id, platform: 'telegram', error: result.error || 'Unknown' })
          }
        } catch (e) {
          errors.push({ alert_id: alert.id, platform: 'telegram', error: String(e) })
        }
      }

      // ----- Web Push -----
      if (userPrefs.push_subscription) {
        try {
          const result = await sendWebPush(userPrefs.push_subscription, round)
          if (result.ok) {
            stats.push_sent++
            anySuccess = true
          } else {
            // Clean up expired subscriptions
            if (result.error?.includes('410')) {
              await supabase
                .from('user_preferences')
                .update({ push_subscription: null })
                .eq('user_id', alert.user_id)
            }
            errors.push({ alert_id: alert.id, platform: 'push', error: result.error || 'Unknown' })
          }
        } catch (e) {
          errors.push({ alert_id: alert.id, platform: 'push', error: String(e) })
        }
      }

      // ----- SMS -----
      if (userPrefs.phone_number && userPrefs.phone_verified) {
        try {
          const result = await sendSms(userPrefs.phone_number, round)
          if (result.ok) {
            stats.sms_sent++
            anySuccess = true
          } else {
            errors.push({ alert_id: alert.id, platform: 'sms', error: result.error || 'Unknown' })
          }
        } catch (e) {
          errors.push({ alert_id: alert.id, platform: 'sms', error: String(e) })
        }
      }

      // ----- Slack channel email (enterprise workaround for users who can't install custom apps) -----
      if (userPrefs.slack_channel_email) {
        try {
          const result = await sendChannelEmail(userPrefs.slack_channel_email, round)
          if (result.ok) {
            stats.channel_email_sent++
            anySuccess = true
          } else {
            errors.push({ alert_id: alert.id, platform: 'slack_channel_email', error: result.error || 'Unknown' })
          }
        } catch (e) {
          errors.push({ alert_id: alert.id, platform: 'slack_channel_email', error: String(e) })
        }
      }

      // ----- Teams channel email (same enterprise workaround for Microsoft Teams) -----
      if (userPrefs.teams_channel_email) {
        try {
          const result = await sendChannelEmail(userPrefs.teams_channel_email, round)
          if (result.ok) {
            stats.channel_email_sent++
            anySuccess = true
          } else {
            errors.push({ alert_id: alert.id, platform: 'teams_channel_email', error: result.error || 'Unknown' })
          }
        } catch (e) {
          errors.push({ alert_id: alert.id, platform: 'teams_channel_email', error: String(e) })
        }
      }

      // Mark as delivered if ANY channel succeeded
      if (anySuccess) {
        deliveredAlertIds.push(alert.id)
        // L5: increment in-batch counter so subsequent alerts in this run
        // see the updated rate-limit state. If this user just hit the cap,
        // mark them so the next iteration short-circuits.
        const newCount = (recentSendCounts.get(alert.user_id) || 0) + 1
        recentSendCounts.set(alert.user_id, newCount)
        if (newCount >= RATE_LIMIT_MAX_PER_WINDOW) {
          rateLimitedUsers.add(alert.user_id)
        }
      }
    }

    // -----------------------------------------------------------------------
    // 4b. Public API match dispatch — fire webhooks to external customers
    //
    // For each new funding_round (last 24h), match it against client_accounts
    // (domain + name) and client_contacts (email domain). One notification per
    // (client_id, funding_round_id) — the unique constraint dedupes on insert.
    // Customers with a registered webhook_url get an HTTP POST; pull-only
    // customers see the match via GET /api/v1/matches.
    // -----------------------------------------------------------------------
    let apiMatchStats = { matched: 0, delivered: 0, failed: 0, no_webhook: 0 }
    try {
      apiMatchStats = await dispatchApiMatches(supabase)
      console.log(
        `API match dispatch: ${apiMatchStats.matched} matches, ${apiMatchStats.delivered} delivered, ${apiMatchStats.failed} failed, ${apiMatchStats.no_webhook} no_webhook`,
      )
    } catch (apiErr) {
      // Never let API-match failures kill the in-app alerts path.
      console.error('API match dispatch error:', apiErr)
    }

    // -----------------------------------------------------------------------
    // 5. Mark delivered alerts as "sent"
    // -----------------------------------------------------------------------

    if (deliveredAlertIds.length > 0) {
      const { error: updateError } = await supabase
        .from('user_alerts')
        .update({ status: 'sent' })
        .in('id', deliveredAlertIds)

      if (updateError) {
        console.error(`Failed to update alert statuses: ${updateError.message}`)
      }
    }

    // -----------------------------------------------------------------------
    // 6. Return summary
    // -----------------------------------------------------------------------

    const total =
      stats.slack_sent +
      stats.teams_sent +
      stats.telegram_sent +
      stats.push_sent +
      stats.sms_sent +
      stats.slack_app_sent +
      stats.channel_email_sent

    const response = {
      success: true,
      ...stats,
      total,
      alerts_delivered: deliveredAlertIds.length,
      api_matches: apiMatchStats,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log(
      `Delivery complete: ${stats.slack_sent} slack, ${stats.slack_app_sent} slack_app, ${stats.teams_sent} teams, ${stats.telegram_sent} telegram, ${stats.push_sent} push, ${stats.sms_sent} sms, ${errors.length} errors`,
    )

    // Log this run to agent_runs for watchdog monitoring
    try {
      await supabase.from('agent_runs').insert({
        agent: 'webhooks',
        domain: 'notification_delivery',
        items: total,
        errors: errors.length,
        summary: { ...stats, alerts_delivered: deliveredAlertIds.length },
        metadata: errors.length > 0 ? { errors: errors.slice(0, 10) } : undefined,
      })
    } catch (logErr) {
      console.error('Failed to log agent_run:', logErr)
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`send-webhooks error: ${message}`)

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
