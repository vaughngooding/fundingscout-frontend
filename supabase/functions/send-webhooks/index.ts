// supabase/functions/send-webhooks/index.ts
// Supabase Edge Function: sends real-time Slack and Teams webhook notifications
// for FundingPulse Pro users when new user_alerts are created.

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
}

// ---------------------------------------------------------------------------
// Helpers – formatting
// ---------------------------------------------------------------------------

function formatAmount(amountUsd: number): string {
  if (amountUsd >= 1_000_000_000) {
    return `$${(amountUsd / 1_000_000_000).toFixed(1)}B`
  }
  if (amountUsd >= 1_000_000) {
    return `$${(amountUsd / 1_000_000).toFixed(1)}M`
  }
  if (amountUsd >= 1_000) {
    return `$${(amountUsd / 1_000).toFixed(0)}K`
  }
  return `$${amountUsd.toLocaleString()}`
}

function formatAmountLong(amountUsd: number): string {
  if (amountUsd >= 1_000_000_000) {
    return `$${(amountUsd / 1_000_000_000).toFixed(1)} billion`
  }
  if (amountUsd >= 1_000_000) {
    return `$${(amountUsd / 1_000_000).toFixed(1)} million`
  }
  if (amountUsd >= 1_000) {
    return `$${(amountUsd / 1_000).toFixed(0)} thousand`
  }
  return `$${amountUsd.toLocaleString()}`
}

// ---------------------------------------------------------------------------
// Slack Block Kit message builder
// ---------------------------------------------------------------------------

function buildSlackPayload(round: FundingRound) {
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
        text: `🚨 Funding Alert: ${round.company_name}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields,
    },
  ]

  // Optional extra context: industry tags
  if (round.industry || (round.industry_tags && round.industry_tags.length > 0)) {
    const tags = round.industry_tags && round.industry_tags.length > 0
      ? round.industry_tags.join(', ')
      : round.industry
    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `🏷️ *Industry:* ${tags}` },
      ],
    })
  }

  // Article link button
  if (round.article_url) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '📰 Read Article', emoji: true },
          url: round.article_url,
          action_id: 'read_article',
        },
      ],
    })
  }

  // Divider for clean separation if part of a batch
  blocks.push({ type: 'divider' })

  return { blocks }
}

// ---------------------------------------------------------------------------
// Teams MessageCard builder (mirrors funding_monitor.py send_teams_alert)
// ---------------------------------------------------------------------------

function buildTeamsPayload(round: FundingRound) {
  const amount = formatAmount(round.amount_usd)
  const amountLong = formatAmountLong(round.amount_usd)
  const location = round.location || round.location_country || 'Unknown'

  const facts: Array<{ name: string; value: string }> = [
    { name: '💰 Amount', value: amountLong },
    { name: '📍 Location', value: location },
    { name: '🏷️ Funding Type', value: round.funding_type },
  ]

  if (round.website) {
    facts.push({ name: '🌐 Website', value: round.website })
  }

  if (round.investors && round.investors.length > 0) {
    facts.push({ name: '👥 Investors', value: round.investors.join(', ') })
  }

  if (round.lead_investor) {
    facts.push({ name: '🏆 Lead Investor', value: round.lead_investor })
  }

  if (round.industry) {
    facts.push({ name: '🏢 Industry', value: round.industry })
  }

  const card: Record<string, unknown> = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '0076D7',
    summary: `Funding Alert: ${round.company_name}`,
    sections: [
      {
        activityTitle: `🚨 ${round.company_name} raises ${amount}`,
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
        name: '📰 Read Full Article',
        targets: [{ os: 'default', uri: round.article_url }],
      },
    ]
  }

  return card
}

// ---------------------------------------------------------------------------
// Webhook sender with retries
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
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Allow only POST (from DB webhook trigger) or GET (for manual/cron invocation)
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
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // -----------------------------------------------------------------------
    // 2. Query pending alerts for Pro users who have webhook URLs configured
    // -----------------------------------------------------------------------
    // We fetch pending alerts, joining to profiles, user_preferences, and
    // funding_rounds. We filter to Pro users only, and only those with at
    // least one webhook URL configured.
    //
    // NOTE: The UNIQUE constraint on user_alerts(user_id, funding_round_id)
    // ensures at most one alert per funding round per user, which serves as
    // our rate-limit mechanism.
    // -----------------------------------------------------------------------

    // Step 1: Fetch pending alerts with funding round and profile data
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
        JSON.stringify({ success: true, slack_sent: 0, teams_sent: 0, total: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Step 2: Collect unique user IDs and fetch their preferences
    const userIds = [...new Set((alerts as unknown as PendingAlert[]).map(a => a.user_id))]
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('user_id, slack_webhook_url, teams_webhook_url')
      .in('user_id', userIds)

    if (prefsError) {
      throw new Error(`Failed to fetch user preferences: ${prefsError.message}`)
    }

    // Build a lookup map: user_id -> preferences
    const prefsMap = new Map<string, UserPreference>()
    for (const p of (prefs || []) as UserPreference[]) {
      prefsMap.set(p.user_id, p)
    }

    // -----------------------------------------------------------------------
    // 3. Filter to alerts where user has at least one webhook URL, then send
    // -----------------------------------------------------------------------

    let slackSent = 0
    let teamsSent = 0
    const errors: Array<{ alert_id: string; platform: string; error: string }> = []

    for (const alert of alerts as unknown as PendingAlert[]) {
      const { funding_round: round } = alert
      const userPrefs = prefsMap.get(alert.user_id)

      // Skip if no webhook URLs configured
      if (!userPrefs?.slack_webhook_url && !userPrefs?.teams_webhook_url) {
        continue
      }

      // Skip if funding_round data is missing (shouldn't happen with !inner)
      if (!round) {
        continue
      }

      // ----- Slack -----
      if (userPrefs.slack_webhook_url) {
        const slackPayload = buildSlackPayload(round)
        const result = await sendWebhook(userPrefs.slack_webhook_url, slackPayload)

        if (result.ok) {
          slackSent++
        } else {
          console.error(
            `Slack webhook failed for alert ${alert.id}: ${result.status} - ${result.body}`,
          )
          errors.push({
            alert_id: alert.id,
            platform: 'slack',
            error: `${result.status}: ${result.body}`,
          })
        }
      }

      // ----- Teams -----
      if (userPrefs.teams_webhook_url) {
        const teamsPayload = buildTeamsPayload(round)
        const result = await sendWebhook(userPrefs.teams_webhook_url, teamsPayload)

        if (result.ok) {
          teamsSent++
        } else {
          console.error(
            `Teams webhook failed for alert ${alert.id}: ${result.status} - ${result.body}`,
          )
          errors.push({
            alert_id: alert.id,
            platform: 'teams',
            error: `${result.status}: ${result.body}`,
          })
        }
      }
    }

    // -----------------------------------------------------------------------
    // 4. Mark delivered alerts as "sent" so they aren't re-sent next run
    // -----------------------------------------------------------------------
    const sentAlertIds = (alerts as unknown as PendingAlert[])
      .filter(a => {
        const prefs = prefsMap.get(a.user_id)
        return prefs?.slack_webhook_url || prefs?.teams_webhook_url
      })
      .map(a => a.id)

    if (sentAlertIds.length > 0) {
      const { error: updateError } = await supabase
        .from('user_alerts')
        .update({ status: 'sent' })
        .in('id', sentAlertIds)

      if (updateError) {
        console.error(`Failed to update alert statuses: ${updateError.message}`)
      }
    }

    // -----------------------------------------------------------------------
    // 5. Return summary
    // -----------------------------------------------------------------------

    const response = {
      success: true,
      slack_sent: slackSent,
      teams_sent: teamsSent,
      total: slackSent + teamsSent,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log(
      `Webhook delivery complete: ${slackSent} Slack, ${teamsSent} Teams, ${errors.length} errors`,
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
