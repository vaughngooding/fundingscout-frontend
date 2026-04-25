import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Webhook } from 'svix'

// POST /api/resend-webhook
// Receives Resend webhook events (email.opened, email.delivered, etc.).
// Verified with svix HMAC signatures. Currently we only act on email.opened
// to track per-user email engagement. Other events are accepted with 200 so
// Resend doesn't retry them.
//
// Required env: RESEND_WEBHOOK_SECRET (from Resend dashboard → Webhooks).

interface ResendEmailEvent {
  type: string
  created_at: string
  data: {
    email_id?: string
    to?: string[]
    from?: string
    subject?: string
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not set')
    return NextResponse.json({ ok: false, error: 'webhook not configured' }, { status: 500 })
  }

  const body = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id') || '',
    'svix-timestamp': req.headers.get('svix-timestamp') || '',
    'svix-signature': req.headers.get('svix-signature') || '',
  }

  let event: ResendEmailEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(body, headers) as ResendEmailEvent
  } catch (err) {
    console.error('[resend-webhook] signature verification failed:', err)
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 })
  }

  // We only update on email.opened. Resend also sends delivered/bounced/clicked/etc.
  if (event.type !== 'email.opened') {
    return NextResponse.json({ ok: true, skipped: event.type }, { status: 200 })
  }

  const recipients = event.data?.to || []
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no recipient' }, { status: 200 })
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Look up profile by recipient email and bump the open counter.
  // Multiple recipients are unusual for our digest format (one user per email), but handle it.
  for (const email of recipients) {
    const normalized = email.toLowerCase().trim()
    const { data: profile, error: lookupErr } = await supabase
      .from('profiles')
      .select('id, email_opens_total')
      .ilike('email', normalized)
      .maybeSingle()
    if (lookupErr || !profile) continue
    await supabase
      .from('profiles')
      .update({
        last_email_opened_at: new Date().toISOString(),
        email_opens_total: (profile.email_opens_total || 0) + 1,
      })
      .eq('id', profile.id)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
