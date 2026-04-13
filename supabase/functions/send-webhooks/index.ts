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
    text += `<b>CEO:</b> ${escapeHtml(ceoLabel)}\n`
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
