import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Trial-ending reminder.
 *
 * Invoked by the stripe-webhook function on `customer.subscription.trial_will_end`
 * (Stripe fires this 3 days before a trial converts).
 *
 * Sends a Resend email reminding the user that their $2.99 trial will
 * convert to $19.99/mo Basic in 3 days, and gives them a one-click cancel
 * link to the Stripe Customer Portal.
 *
 * Body shape (JSON):
 *   { stripe_customer_id: string, trial_end: number | null }
 *
 * Auth: requires the SUPABASE_SERVICE_ROLE_KEY as a Bearer token (the
 * stripe-webhook forwards it).
 *
 * Failure mode: any error logs and returns 200 — we don't want webhook
 * retries flooding the queue when Resend is down.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'alerts@fundingscout.io'
const SITE_URL = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://fundingscout.io'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function formatDate(unixSeconds: number | null): string {
  if (!unixSeconds) return 'in 3 days'
  const d = new Date(unixSeconds * 1000)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  })
}

function buildEmail(name: string, trialEnd: number | null) {
  const dateStr = formatDate(trialEnd)
  const subject = `Your FundingScout trial converts to Basic ($19.99/mo) on ${dateStr}`
  const portalLink = `${SITE_URL}/settings`

  const text = [
    `Hi ${name},`,
    '',
    `Your FundingScout 7-day trial converts to the Basic plan ($19.99/month) on ${dateStr}.`,
    '',
    'No action needed if you want to keep going — your card will be charged automatically and you keep your daily digest, dashboard, and saved filters.',
    '',
    `If you'd rather cancel before the conversion, you can do that in one click here:`,
    portalLink,
    '',
    'Want unlimited real-time alerts (SMS, Slack, Teams, Telegram, web push, bookmarks, CSV export)? Upgrade to Pro from the same page.',
    '',
    '— FundingScout',
  ].join('\n')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0f172a;">
      <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Your trial converts on ${dateStr}</h1>
      <p style="font-size:15px;line-height:1.6;color:#334155;">Hi ${name},</p>
      <p style="font-size:15px;line-height:1.6;color:#334155;">
        Your FundingScout 7-day trial converts to the <strong>Basic plan ($19.99/month)</strong> on ${dateStr}.
      </p>
      <p style="font-size:15px;line-height:1.6;color:#334155;">
        No action needed if you want to keep going — your card will be charged automatically and you keep your daily digest, dashboard, and saved filters.
      </p>
      <p style="margin:28px 0;">
        <a href="${portalLink}" style="display:inline-block;background:#10b981;color:#fff;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:9999px;font-size:14px;">Manage subscription</a>
      </p>
      <p style="font-size:14px;line-height:1.6;color:#475569;">
        Want unlimited real-time alerts (SMS, Slack, Teams, Telegram, web push, bookmarks, CSV export)? You can upgrade to Pro from the same page.
      </p>
      <p style="font-size:13px;color:#94a3b8;margin-top:32px;">— FundingScout</p>
    </div>
  `

  return { subject, text, html }
}

async function sendEmail(to: string, subject: string, text: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log('trial-ending: RESEND_API_KEY not configured, skipping email')
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      text,
      html,
    }),
  })
  if (!res.ok) {
    console.error('trial-ending: Resend send failed', res.status, await res.text())
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Service-role auth check (the stripe-webhook forwards this).
  const auth = request.headers.get('authorization') || ''
  if (!auth.includes(SUPABASE_SERVICE_ROLE_KEY)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: { stripe_customer_id?: string; trial_end?: number | null }
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const customerId = body.stripe_customer_id
  if (!customerId) {
    return new Response('Missing stripe_customer_id', { status: 400 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('stripe_customer_id', customerId)
    .single()

  if (error || !profile) {
    console.error('trial-ending: no profile for customer', customerId, error)
    // Return 200 anyway so the webhook doesn't retry forever.
    return new Response(JSON.stringify({ ok: false, reason: 'no_profile' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const name = profile.full_name?.split(' ')[0] || 'there'
  const { subject, text, html } = buildEmail(name, body.trial_end ?? null)

  try {
    await sendEmail(profile.email, subject, text, html)
    console.log(`trial-ending: sent reminder to ${profile.email} for customer ${customerId}`)
  } catch (err) {
    console.error('trial-ending: send failed', err)
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
