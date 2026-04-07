// supabase/functions/slack-interactions/index.ts
// Handles Slack slash commands (/funding) and interactive button actions
// (bookmark, dismiss, snooze) from the full Slack App.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Slack signature verification (HMAC-SHA256)
// ---------------------------------------------------------------------------

async function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string,
): Promise<boolean> {
  // Reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - Number(timestamp)) > 300) {
    return false
  }

  const sigBasestring = `v0:${timestamp}:${body}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(sigBasestring),
  )
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const expected = `v0=${hex}`

  return expected === signature
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatAmount(amountUsd: number): string {
  if (amountUsd >= 1_000_000_000) return `$${(amountUsd / 1_000_000_000).toFixed(1)}B`
  if (amountUsd >= 1_000_000) return `$${(amountUsd / 1_000_000).toFixed(1)}M`
  if (amountUsd >= 1_000) return `$${(amountUsd / 1_000).toFixed(0)}K`
  return `$${amountUsd.toLocaleString()}`
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET')
  if (!signingSecret) {
    return new Response('Missing SLACK_SIGNING_SECRET', { status: 500 })
  }

  const body = await req.text()
  const timestamp = req.headers.get('x-slack-request-timestamp') || ''
  const signature = req.headers.get('x-slack-signature') || ''

  const valid = await verifySlackSignature(body, timestamp, signature, signingSecret)
  if (!valid) {
    return new Response('Invalid signature', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Parse the URL-encoded body
  const params = new URLSearchParams(body)

  // ---------------------------------------------------------------------------
  // Slash command: /funding
  // ---------------------------------------------------------------------------
  if (params.has('command')) {
    const teamId = params.get('team_id')
    if (!teamId) {
      return new Response(
        JSON.stringify({ response_type: 'ephemeral', text: 'Unable to identify workspace.' }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Find user by slack_team_id
    const { data: userPref } = await supabase
      .from('user_preferences')
      .select('user_id')
      .eq('slack_team_id', teamId)
      .eq('slack_app_installed', true)
      .limit(1)
      .single()

    if (!userPref) {
      return new Response(
        JSON.stringify({
          response_type: 'ephemeral',
          text: 'No FundingScout account linked to this Slack workspace.',
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Fetch 5 most recent alerts
    const { data: alerts } = await supabase
      .from('user_alerts')
      .select(`
        id,
        status,
        is_bookmarked,
        funding_round:funding_rounds!inner (
          company_name, amount_usd, funding_type, article_url
        )
      `)
      .eq('user_id', userPref.user_id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ response_type: 'ephemeral', text: 'No recent funding alerts.' }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }

    const blocks: Array<Record<string, unknown>> = [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'Recent Funding Alerts', emoji: true },
      },
    ]

    for (const alert of alerts as Array<Record<string, unknown>>) {
      const round = alert.funding_round as {
        company_name: string
        amount_usd: number
        funding_type: string
        article_url: string
      }
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${round.company_name}* — ${formatAmount(round.amount_usd)} (${round.funding_type})`,
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'View', emoji: true },
          url: round.article_url,
          action_id: 'view_article',
        },
      })
      blocks.push({
        type: 'actions',
        block_id: `alert_${alert.id}`,
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: alert.is_bookmarked ? 'Bookmarked' : 'Bookmark', emoji: true },
            action_id: 'bookmark_alert',
            value: alert.id as string,
            style: alert.is_bookmarked ? undefined : 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Dismiss', emoji: true },
            action_id: 'dismiss_alert',
            value: alert.id as string,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Snooze 24h', emoji: true },
            action_id: 'snooze_alert',
            value: alert.id as string,
          },
        ],
      })
      blocks.push({ type: 'divider' })
    }

    return new Response(
      JSON.stringify({ response_type: 'in_channel', blocks }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }

  // ---------------------------------------------------------------------------
  // Interactive component callback (buttons)
  // ---------------------------------------------------------------------------
  if (params.has('payload')) {
    const payload = JSON.parse(params.get('payload')!)
    const action = payload.actions?.[0]
    if (!action) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const alertId = action.value

    if (action.action_id === 'bookmark_alert') {
      // Toggle bookmark
      const { data: alert } = await supabase
        .from('user_alerts')
        .select('is_bookmarked')
        .eq('id', alertId)
        .single()

      if (alert) {
        await supabase
          .from('user_alerts')
          .update({ is_bookmarked: !alert.is_bookmarked })
          .eq('id', alertId)
      }

      return new Response(
        JSON.stringify({
          response_type: 'ephemeral',
          text: alert?.is_bookmarked ? 'Bookmark removed.' : 'Alert bookmarked!',
          replace_original: false,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (action.action_id === 'dismiss_alert') {
      await supabase
        .from('user_alerts')
        .update({ status: 'archived' })
        .eq('id', alertId)

      return new Response(
        JSON.stringify({
          response_type: 'ephemeral',
          text: 'Alert dismissed.',
          replace_original: false,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (action.action_id === 'snooze_alert') {
      // Mark as pending again — the daily digest will re-surface it
      await supabase
        .from('user_alerts')
        .update({ status: 'pending' })
        .eq('id', alertId)

      return new Response(
        JSON.stringify({
          response_type: 'ephemeral',
          text: 'Alert snoozed for 24 hours.',
          replace_original: false,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
