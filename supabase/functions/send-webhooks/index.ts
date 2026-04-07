// supabase/functions/send-webhooks/index.ts
// Supabase Edge Function: multi-channel notification dispatcher.
// Sends real-time alerts via Slack (webhook or app), Teams, Telegram, Web Push,
// and SMS for FundingScout Pro users when new user_alerts are created.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  let text = `<b>Funding Alert: ${escapeHtml(round.company_name)}</b>\n\n`
  text += `<b>Amount:</b> ${amount}\n`
  text += `<b>Round:</b> ${escapeHtml(round.funding_type)}\n`
  text += `<b>Location:</b> ${escapeHtml(location)}\n`
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

  const payload = JSON.stringify(buildWebPushPayload(round))

  // Web Push requires RFC 8291 encryption. In Deno edge functions we use
  // a simplified approach — POST the payload as plain JSON to the push endpoint
  // with VAPID JWT authorization. For full encryption, consider the web-push npm
  // package via esm.sh.
  //
  // Simplified VAPID auth approach:
  try {
    // Create VAPID JWT
    const audience = new URL(subscription.endpoint).origin
    const vapidJwt = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey)

    // For a proper implementation, the payload needs to be encrypted using
    // the subscription keys (p256dh, auth) per RFC 8291. For now, we send
    // using the standard Web Push protocol headers.
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        Authorization: `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
        TTL: '86400',
        Urgency: 'high',
      },
      body: payload,
    })

    if (res.status === 201 || res.status === 200) {
      return { ok: true }
    }
    // 410 Gone = subscription expired, should be cleaned up
    if (res.status === 410) {
      return { ok: false, error: 'Subscription expired (410)' }
    }
    const body = await res.text()
    return { ok: false, error: `${res.status}: ${body}` }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function createVapidJwt(
  audience: string,
  _publicKey: string,
  privateKeyBase64: string,
): Promise<string> {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const now = Math.floor(Date.now() / 1000)
  const payload = btoa(
    JSON.stringify({
      aud: audience,
      exp: now + 12 * 60 * 60,
      sub: 'mailto:alerts@fundingscout.io',
    }),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const unsignedToken = `${header}.${payload}`

  // Import the private key
  const rawKey = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
    c.charCodeAt(0),
  )

  const key = await crypto.subtle.importKey(
    'pkcs8',
    rawKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken),
  )

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${unsignedToken}.${sig}`
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
          created_at
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
        'user_id, slack_webhook_url, teams_webhook_url, telegram_chat_id, push_subscription, phone_number, phone_verified, slack_bot_token, slack_channel_id, slack_app_installed',
      )
      .in('user_id', userIds)

    if (prefsError) {
      throw new Error(`Failed to fetch user preferences: ${prefsError.message}`)
    }

    const prefsMap = new Map<string, UserPreference>()
    for (const p of (prefs || []) as UserPreference[]) {
      prefsMap.set(p.user_id, p)
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
    }
    const errors: Array<{ alert_id: string; platform: string; error: string }> = []
    const deliveredAlertIds: string[] = []

    for (const alert of alerts as unknown as PendingAlert[]) {
      const { funding_round: round } = alert
      const userPrefs = prefsMap.get(alert.user_id)

      if (!round || !userPrefs) continue

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

      // ----- Telegram -----
      if (userPrefs.telegram_chat_id) {
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

      // Mark as delivered if ANY channel succeeded
      if (anySuccess) {
        deliveredAlertIds.push(alert.id)
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
      stats.slack_app_sent

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
