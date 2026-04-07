import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/verify-phone
// Body: { action: "send", phone: "555-123-4567" } or { action: "confirm", code: "123456" }
//
// Uses Twilio Verify API (NOT raw Messages API) to bypass A2P 10DLC.
// Twilio generates and validates the code server-side; we just persist
// the phone number and flip phone_verified=true on success.

/**
 * Normalize a user-entered phone number to E.164 format (e.g., "+15551234567").
 * Twilio Verify rejects anything that isn't already E.164. This handles the common
 * cases: "(555) 123-4567", "555-123-4567", "5551234567", "+1 555 123 4567" etc.
 *
 * Defaults to US (+1) if no country code is provided. Returns null if the input
 * doesn't look like a valid phone number.
 */
function normalizePhone(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Strip everything except digits and a leading + sign
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/[^\d]/g, '')

  if (hasPlus) {
    // User typed an international number with + prefix; trust it (must be 8-15 digits per E.164)
    if (digits.length < 8 || digits.length > 15) return null
    return `+${digits}`
  }

  // No + prefix — assume US/Canada
  if (digits.length === 10) {
    // Bare 10-digit US number → prepend +1
    return `+1${digits}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    // 11-digit US number starting with 1 → just add +
    return `+${digits}`
  }

  return null
}

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
    console.error('verify-phone: missing Twilio env vars', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasVerifySid: !!verifySid,
    })
    return NextResponse.json(
      { error: 'Phone verification not configured on the server.' },
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

    // Normalize to E.164 — Twilio Verify will reject anything else
    const normalized = normalizePhone(phone)
    if (!normalized) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number (e.g., 555-123-4567 for US numbers).' },
        { status: 400 },
      )
    }

    // Persist the normalized phone number on the user_preferences row (not yet verified)
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          phone_number: normalized,
          phone_verified: false,
        },
        { onConflict: 'user_id' },
      )

    if (upsertError) {
      console.error('verify-phone: upsert error', upsertError)
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
        body: new URLSearchParams({ To: normalized, Channel: 'sms' }).toString(),
      },
    )

    if (!twilioRes.ok) {
      const errText = await twilioRes.text()
      console.error(`verify-phone: Twilio Verify send error (${twilioRes.status})`, errText)
      // Try to extract Twilio's user-friendly message
      let userMessage = 'Failed to send verification code'
      try {
        const errJson = JSON.parse(errText)
        if (errJson.message) userMessage = errJson.message
      } catch {
        // errText wasn't JSON, leave default
      }
      return NextResponse.json({ error: userMessage, twilio_status: twilioRes.status }, { status: 502 })
    }

    return NextResponse.json({ sent: true })
  }

  if (action === 'confirm') {
    const { code } = body
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code required' }, { status: 400 })
    }

    // Read the persisted phone_number (already normalized when we saved it)
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
      console.error('verify-phone: Twilio Verify check failed', { status: twilioRes.status, result })
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
