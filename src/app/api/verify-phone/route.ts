import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/verify-phone
// Body: { action: "send", phone: "+1..." } or { action: "confirm", code: "123456" }
//
// Uses Twilio Verify API (NOT raw Messages API) to bypass A2P 10DLC.
// Twilio generates and validates the code server-side; we just persist
// the phone number and flip phone_verified=true on success.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID

  if (!accountSid || !authToken || !verifySid) {
    return NextResponse.json(
      { error: 'Phone verification not configured. Set TWILIO_VERIFY_SERVICE_SID.' },
      { status: 500 },
    )
  }

  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const body = await req.json()
  const { action } = body

  if (action === 'send') {
    const { phone } = body
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }

    // Persist the phone number on the user_preferences row (not yet verified)
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          phone_number: phone,
          phone_verified: false,
        },
        { onConflict: 'user_id' },
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Ask Twilio Verify to send a code via SMS
    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, Channel: 'sms' }).toString(),
      },
    )

    if (!twilioRes.ok) {
      const errText = await twilioRes.text()
      console.error(`Twilio Verify send error: ${errText}`)
      return NextResponse.json({ error: 'Failed to send verification code' }, { status: 502 })
    }

    return NextResponse.json({ sent: true })
  }

  if (action === 'confirm') {
    const { code } = body
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code required' }, { status: 400 })
    }

    // Read the persisted phone_number
    const { data: prefs, error: fetchError } = await supabase
      .from('user_preferences')
      .select('phone_number')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !prefs?.phone_number) {
      return NextResponse.json({ error: 'No phone number on file. Send a code first.' }, { status: 400 })
    }

    // Ask Twilio Verify to check the code
    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: prefs.phone_number, Code: code }).toString(),
      },
    )

    const result = await twilioRes.json()

    if (!twilioRes.ok || result.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    // Mark phone as verified. SMS will start dispatching automatically because the
    // send-webhooks edge function gates on (phone_number && phone_verified).
    // iMessage stays opt-in (default false) until v1.1 with the business Apple ID.
    const { error: updateError } = await supabase
      .from('user_preferences')
      .update({
        phone_verified: true,
      })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ verified: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
