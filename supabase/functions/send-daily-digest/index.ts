import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { shouldSendDigest, digestAlertLimit } from './digest-policy.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FundingRound {
  company_name: string
  amount_usd: number | null
  funding_type: string | null
  location: string | null
  investors: string[] | null
  article_url: string | null
}

interface UserAlert {
  id: string
  created_at: string
  funding_round: FundingRound
}

interface UserPreference {
  user_id: string
  digest_frequency: string | null
  digest_hour: number | null
  profiles: {
    email: string
    full_name: string | null
    plan: string
    legacy_free: boolean | null
    timezone: string | null
  }
}

// Default digest hour when the user hasn't set one — "end of day" per product
// spec. 20 local = 8pm user time.
const DEFAULT_DIGEST_HOUR = 20
// Weekly digest fires on this day of week (0=Sunday, 1=Monday, ..., 5=Friday,
// 6=Saturday). Friday = end of work week, matches standard "week in review"
// cadence. If you change this, also update the scheduler cron comment.
const WEEKLY_DIGEST_DOW = 5

function formatAmount(amountUsd: number | null, fundingType: string | null): string {
  if (!amountUsd) {
    return fundingType ? `${fundingType} Round` : 'Undisclosed Amount'
  }

  let formatted: string
  if (amountUsd >= 1_000_000_000) {
    formatted = `$${(amountUsd / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  } else if (amountUsd >= 1_000_000) {
    formatted = `$${(amountUsd / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  } else if (amountUsd >= 1_000) {
    formatted = `$${(amountUsd / 1_000).toFixed(0)}K`
  } else {
    formatted = `$${amountUsd}`
  }

  return fundingType ? `${formatted} ${fundingType} Round` : formatted
}

// Returns {hour, dayOfWeek} in the given IANA timezone (e.g. "America/New_York").
// Falls back to UTC if the timezone string is invalid.
function getLocalTime(timezone: string | null): { hour: number; dayOfWeek: number } {
  const now = new Date()
  try {
    const tz = timezone || 'UTC'
    const hourFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    })
    const weekdayFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
    })
    const hour = parseInt(hourFmt.format(now), 10)
    const weekday = weekdayFmt.format(now)
    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }
    return { hour, dayOfWeek: dayMap[weekday] ?? now.getUTCDay() }
  } catch {
    return { hour: now.getUTCHours(), dayOfWeek: now.getUTCDay() }
  }
}

function buildEmailHtml(
  userName: string | null,
  alerts: UserAlert[],
  appBaseUrl: string,
  cadence: 'daily' | 'weekly',
): string {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  const alertCount = alerts.length
  const periodLabel = cadence === 'weekly' ? 'weekly' : 'daily'
  const periodText = cadence === 'weekly' ? 'this week' : 'today'

  const alertRows = alerts
    .map((alert) => {
      const fr = alert.funding_round
      const amountText = formatAmount(fr.amount_usd, fr.funding_type)
      const locationLine = fr.location
        ? `<p style="margin:0;color:#6b7280;font-size:14px;">${fr.location}</p>`
        : ''
      const investorsLine =
        fr.investors && fr.investors.length > 0
          ? `<p style="margin:4px 0 0 0;color:#6b7280;font-size:13px;">Investors: ${fr.investors.join(', ')}</p>`
          : ''
      const articleLink = fr.article_url
        ? `<a href="${fr.article_url}" style="display:inline-block;margin-top:8px;color:#2563eb;font-size:13px;text-decoration:none;font-weight:500;">Read Article &rarr;</a>`
        : ''

      return `
        <tr>
          <td style="padding:16px 24px;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0 0 2px 0;font-size:16px;font-weight:700;color:#111827;">${fr.company_name}</p>
            <p style="margin:0;font-size:14px;color:#059669;font-weight:600;">${amountText}</p>
            ${locationLine}
            ${investorsLine}
            ${articleLink}
          </td>
        </tr>`
    })
    .join('\n')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your FundingScout Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">FundingScout</h1>
              <p style="margin:4px 0 0 0;color:#dbeafe;font-size:14px;">Your ${periodLabel} funding digest</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 24px 8px 24px;">
              <p style="margin:0;font-size:15px;color:#374151;">${greeting}</p>
              <p style="margin:8px 0 0 0;font-size:15px;color:#374151;">
                You have <strong>${alertCount} new funding alert${alertCount !== 1 ? 's' : ''}</strong> ${periodText} matching your criteria.
              </p>
            </td>
          </tr>

          <!-- Alerts -->
          <tr>
            <td style="padding:8px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${alertRows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:16px 24px 24px 24px;">
              <a href="${appBaseUrl}/dashboard" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:6px;">
                View All in Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                <a href="${appBaseUrl}/settings/notifications" style="color:#6b7280;text-decoration:underline;">Manage preferences</a>
                &nbsp;&middot;&nbsp;
                <a href="${appBaseUrl}/unsubscribe" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
              </p>
              <p style="margin:8px 0 0 0;font-size:11px;color:#d1d5db;text-align:center;">
                FundingScout &mdash; Startup funding intelligence, delivered.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://fundingscout.io'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ---------------------------------------------------------------
    // 1. Fetch every user whose digest_frequency is daily or weekly.
    //    We pull timezone from profiles (not user_preferences — there's
    //    no timezone column there). Filtering by digest_hour + day-of-week
    //    is done in code because timezone arithmetic is messy in SQL.
    // ---------------------------------------------------------------
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select(`
        user_id,
        digest_frequency,
        digest_hour,
        profiles!inner (
          email,
          full_name,
          plan,
          legacy_free,
          timezone
        )
      `)
      .in('digest_frequency', ['daily', 'weekly'])

    if (prefError) {
      throw new Error(`Failed to fetch user preferences: ${prefError.message}`)
    }

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ success: true, emails_sent: 0, message: 'No users with digest enabled.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // 2. Filter to users whose LOCAL hour matches their digest_hour
    //    (default 20 / 8pm local). Weekly digests additionally require
    //    today to be the configured day-of-week (Friday by default).
    // ---------------------------------------------------------------
    const eligibleUsers = (preferences as unknown as UserPreference[]).filter((pref) => {
      const { hour, dayOfWeek } = getLocalTime(pref.profiles.timezone)
      const targetHour = pref.digest_hour ?? DEFAULT_DIGEST_HOUR

      if (hour !== targetHour) {
        return false
      }

      if (pref.digest_frequency === 'weekly') {
        return dayOfWeek === WEEKLY_DIGEST_DOW
      }

      // daily
      return true
    })

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          emails_sent: 0,
          candidates_checked: preferences.length,
          message: 'No users scheduled for this hour.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // 3. For each eligible user, fetch pending alerts, send email,
    //    and mark alerts as sent. Weekly users get the last 7 days of
    //    alerts; daily users get whatever has accumulated as pending.
    // ---------------------------------------------------------------
    let emailsSent = 0
    const errors: string[] = []

    for (const user of eligibleUsers) {
      try {
        const plan = user.profiles.plan
        const legacyFree = user.profiles.legacy_free === true

        // Paywalled users (plan='free' AND legacy_free=false) lost access
        // when their subscription cancelled — never send them a digest.
        // Pro keeps the 50-alert cap. Basic and legacy_free both get the
        // historical 10-alert cap (matches the old "free user" behaviour).
        if (!shouldSendDigest(plan, legacyFree)) {
          continue
        }
        const alertLimit = digestAlertLimit(plan)
        const cadence: 'daily' | 'weekly' =
          user.digest_frequency === 'weekly' ? 'weekly' : 'daily'

        // Weekly digest: include all alerts (sent or pending) from the
        // last 7 days, so Pro users who already got real-time alerts also
        // get a weekly recap. Daily digest: only pending alerts (users on
        // real-time channels have already seen everything marked 'sent').
        let alertQuery = supabase
          .from('user_alerts')
          .select(`
            id,
            created_at,
            funding_round:funding_rounds (
              company_name,
              amount_usd,
              funding_type,
              location,
              investors,
              article_url
            )
          `)
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false })
          .limit(alertLimit)

        if (cadence === 'weekly') {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          alertQuery = alertQuery.gte('created_at', sevenDaysAgo)
        } else {
          alertQuery = alertQuery.eq('status', 'pending')
        }

        const { data: pendingAlerts, error: alertError } = await alertQuery

        if (alertError) {
          errors.push(`User ${user.user_id}: failed to fetch alerts — ${alertError.message}`)
          continue
        }

        if (!pendingAlerts || pendingAlerts.length === 0) {
          continue
        }

        const alerts = pendingAlerts as unknown as UserAlert[]

        // Build the email HTML
        const html = buildEmailHtml(user.profiles.full_name, alerts, appBaseUrl, cadence)
        const alertCount = alerts.length
        const periodPrefix = cadence === 'weekly' ? 'Weekly' : 'Daily'
        const subject = `Your ${periodPrefix} Funding Digest — ${alertCount} alert${alertCount !== 1 ? 's' : ''}`

        // Send via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FundingScout <alerts@fundingscout.io>',
            to: [user.profiles.email],
            subject,
            html,
          }),
        })

        if (!resendResponse.ok) {
          const resendError = await resendResponse.text()
          errors.push(`User ${user.user_id}: Resend API error — ${resendError}`)
          continue
        }

        // Mark alerts as sent (daily only — for weekly we just show a
        // recap and don't flip status, since 'sent' already means
        // real-time-delivered).
        if (cadence === 'daily') {
          const alertIds = alerts.map((a) => a.id)
          const { error: updateError } = await supabase
            .from('user_alerts')
            .update({
              status: 'sent',
              email_sent_at: new Date().toISOString(),
            })
            .in('id', alertIds)

          if (updateError) {
            errors.push(`User ${user.user_id}: failed to update alert status — ${updateError.message}`)
            // Email was still sent, so we count it
          }
        }

        emailsSent++
      } catch (userError) {
        const message = userError instanceof Error ? userError.message : String(userError)
        errors.push(`User ${user.user_id}: unexpected error — ${message}`)
      }
    }

    // ---------------------------------------------------------------
    // 4. Return summary
    // ---------------------------------------------------------------
    const response: Record<string, unknown> = {
      success: true,
      emails_sent: emailsSent,
      users_eligible: eligibleUsers.length,
      candidates_checked: preferences.length,
    }

    if (errors.length > 0) {
      response.errors = errors
    }

    // Log this run to agent_runs for watchdog monitoring
    try {
      await supabase.from('agent_runs').insert({
        agent: 'digest',
        domain: 'notification_delivery',
        items: emailsSent,
        errors: errors.length,
        summary: {
          emails_sent: emailsSent,
          users_eligible: eligibleUsers.length,
          candidates_checked: preferences.length,
        },
        metadata: errors.length > 0 ? { errors: errors.slice(0, 10) } : undefined,
      })
    } catch (logErr) {
      console.error('Failed to log agent_run:', logErr)
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('send-daily-digest error:', message)

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
