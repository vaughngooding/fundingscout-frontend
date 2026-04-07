import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FundingRound {
  company_name: string
  amount: number | null
  round_type: string | null
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
  digest_hour: number
  timezone: string
  profiles: {
    email: string
    full_name: string | null
    plan: string
  }
}

function formatAmount(amount: number | null, roundType: string | null): string {
  if (!amount) {
    return roundType ? `${roundType} Round` : 'Undisclosed Amount'
  }

  let formatted: string
  if (amount >= 1_000_000_000) {
    formatted = `$${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  } else if (amount >= 1_000_000) {
    formatted = `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  } else if (amount >= 1_000) {
    formatted = `$${(amount / 1_000).toFixed(0)}K`
  } else {
    formatted = `$${amount}`
  }

  return roundType ? `${formatted} ${roundType} Round` : formatted
}

function getUtcHourForTimezone(timezone: string): number {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const localHour = parseInt(formatter.format(now), 10)
    return localHour
  } catch {
    // Default to UTC if timezone is invalid
    return new Date().getUTCHours()
  }
}

function buildEmailHtml(
  userName: string | null,
  alerts: UserAlert[],
  appBaseUrl: string
): string {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  const alertCount = alerts.length

  const alertRows = alerts
    .map((alert) => {
      const fr = alert.funding_round
      const amountText = formatAmount(fr.amount, fr.round_type)
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
              <p style="margin:4px 0 0 0;color:#dbeafe;font-size:14px;">Your daily funding digest</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 24px 8px 24px;">
              <p style="margin:0;font-size:15px;color:#374151;">${greeting}</p>
              <p style="margin:8px 0 0 0;font-size:15px;color:#374151;">
                You have <strong>${alertCount} new funding alert${alertCount !== 1 ? 's' : ''}</strong> matching your criteria.
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
    // 1. Determine the current UTC hour
    // ---------------------------------------------------------------
    const currentUtcHour = new Date().getUTCHours()

    // ---------------------------------------------------------------
    // 2. Find users whose digest_hour matches the current hour in
    //    their local timezone.
    //    We fetch all preferences and filter in code because timezone
    //    offset math is non-trivial in SQL.
    // ---------------------------------------------------------------
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select(`
        user_id,
        digest_hour,
        timezone,
        profiles!inner (
          email,
          full_name,
          plan
        )
      `)
      .eq('email_notifications', true)

    if (prefError) {
      throw new Error(`Failed to fetch user preferences: ${prefError.message}`)
    }

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ success: true, emails_sent: 0, message: 'No users with email notifications enabled.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter to users whose local hour matches their preferred digest_hour
    const eligibleUsers = (preferences as unknown as UserPreference[]).filter((pref) => {
      const localHour = getUtcHourForTimezone(pref.timezone)
      return localHour === pref.digest_hour
    })

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, emails_sent: 0, message: 'No users scheduled for this hour.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---------------------------------------------------------------
    // 3. For each eligible user, fetch pending alerts, send email,
    //    and mark alerts as sent.
    // ---------------------------------------------------------------
    let emailsSent = 0
    const errors: string[] = []

    for (const user of eligibleUsers) {
      try {
        const isFreeUser = user.profiles.plan === 'free'
        const alertLimit = isFreeUser ? 3 : 50

        // Fetch pending alerts joined with funding_rounds
        const { data: pendingAlerts, error: alertError } = await supabase
          .from('user_alerts')
          .select(`
            id,
            created_at,
            funding_round:funding_rounds (
              company_name,
              amount,
              round_type,
              location,
              investors,
              article_url
            )
          `)
          .eq('user_id', user.user_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(alertLimit)

        if (alertError) {
          errors.push(`User ${user.user_id}: failed to fetch alerts — ${alertError.message}`)
          continue
        }

        if (!pendingAlerts || pendingAlerts.length === 0) {
          continue
        }

        const alerts = pendingAlerts as unknown as UserAlert[]

        // Build the email HTML
        const html = buildEmailHtml(user.profiles.full_name, alerts, appBaseUrl)
        const alertCount = alerts.length
        const subject = `Your Funding Digest — ${alertCount} new alert${alertCount !== 1 ? 's' : ''}`

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

        // Mark alerts as sent
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
      current_utc_hour: currentUtcHour,
    }

    if (errors.length > 0) {
      response.errors = errors
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
