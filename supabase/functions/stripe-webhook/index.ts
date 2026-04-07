import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ---------- Signature verification helpers ----------

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): Promise<boolean> {
  // Parse the Stripe-Signature header
  const parts = signatureHeader.split(',').reduce(
    (acc, part) => {
      const [key, value] = part.split('=')
      acc[key.trim()] = value
      return acc
    },
    {} as Record<string, string>
  )

  const timestamp = parts['t']
  const expectedSignature = parts['v1']

  if (!timestamp || !expectedSignature) {
    console.error('Missing timestamp or v1 signature in Stripe-Signature header')
    return false
  }

  // Check timestamp tolerance to prevent replay attacks
  const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)
  if (timestampAge > toleranceSeconds) {
    console.error(`Webhook timestamp too old: ${timestampAge}s exceeds ${toleranceSeconds}s tolerance`)
    return false
  }

  // Compute expected signature: HMAC-SHA256(secret, "timestamp.payload")
  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  )

  const computedSignature = uint8ArrayToHex(new Uint8Array(signatureBuffer))

  // Constant-time comparison via subtle crypto digest trick:
  // Compare the hex strings byte-by-byte. A timing-safe compare is ideal,
  // but Deno does not expose one directly. We use a length check + reduce
  // to approximate constant-time behaviour.
  if (computedSignature.length !== expectedSignature.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < computedSignature.length; i++) {
    mismatch |= computedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
  }

  return mismatch === 0
}

// ---------- Event handlers ----------

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function handleCheckoutCompleted(session: Record<string, unknown>) {
  // Prefer metadata.user_id (set in create-checkout) — it's the most reliable
  // way to match a Stripe session back to a Supabase user. Email lookup is a
  // fallback for older sessions or edge cases.
  const metadata = session.metadata as Record<string, string> | null
  const userIdFromMetadata = metadata?.user_id || null

  const customerEmail = (session.customer_email as string | null)
    ?? ((session.customer_details as Record<string, unknown> | null)?.email as string | null)

  const stripeCustomerId = session.customer as string | null

  let profileId: string | null = null

  // Strategy 1: lookup by metadata.user_id (preferred)
  if (userIdFromMetadata) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userIdFromMetadata)
      .single()
    if (profile && !error) {
      profileId = profile.id
    } else {
      console.warn('checkout.session.completed: metadata.user_id lookup failed', userIdFromMetadata, error)
    }
  }

  // Strategy 2: fall back to case-insensitive email lookup
  if (!profileId && customerEmail) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', customerEmail)
      .single()
    if (profile && !error) {
      profileId = profile.id
    } else {
      console.warn('checkout.session.completed: email lookup failed', customerEmail, error)
    }
  }

  if (!profileId) {
    console.error(
      'checkout.session.completed: could not match session to any profile',
      { userIdFromMetadata, customerEmail, stripeCustomerId },
    )
    return
  }

  // Upgrade user to pro and store the Stripe customer ID
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      plan: 'pro',
      stripe_customer_id: stripeCustomerId,
    })
    .eq('id', profileId)

  if (updateError) {
    console.error('checkout.session.completed: failed to update profile', updateError)
  } else {
    console.log(`checkout.session.completed: upgraded profile ${profileId} to pro (matched via ${userIdFromMetadata ? 'metadata' : 'email'})`)
  }
}

async function handleSubscriptionUpdated(subscription: Record<string, unknown>) {
  const stripeCustomerId = subscription.customer as string
  const status = subscription.status as string

  if (!stripeCustomerId) {
    console.error('customer.subscription.updated: no customer ID on subscription')
    return
  }

  let newPlan: 'pro' | 'free'

  if (status === 'active') {
    newPlan = 'pro'
  } else if (['canceled', 'past_due', 'unpaid'].includes(status)) {
    newPlan = 'free'
  } else {
    console.log(`customer.subscription.updated: unhandled subscription status "${status}", skipping`)
    return
  }

  const { error } = await supabase
    .from('profiles')
    .update({ plan: newPlan })
    .eq('stripe_customer_id', stripeCustomerId)

  if (error) {
    console.error('customer.subscription.updated: failed to update profile', error)
  } else {
    console.log(`customer.subscription.updated: set plan=${newPlan} for customer ${stripeCustomerId}`)
  }
}

async function handleSubscriptionDeleted(subscription: Record<string, unknown>) {
  const stripeCustomerId = subscription.customer as string

  if (!stripeCustomerId) {
    console.error('customer.subscription.deleted: no customer ID on subscription')
    return
  }

  const { error } = await supabase
    .from('profiles')
    .update({ plan: 'free' })
    .eq('stripe_customer_id', stripeCustomerId)

  if (error) {
    console.error('customer.subscription.deleted: failed to update profile', error)
  } else {
    console.log(`customer.subscription.deleted: downgraded customer ${stripeCustomerId} to free`)
  }
}

// ---------- Edge function handler ----------

Deno.serve(async (request: Request) => {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signatureHeader = request.headers.get('stripe-signature')
  if (!signatureHeader) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const payload = await request.text()

  // Verify the webhook signature
  const isValid = await verifyStripeSignature(payload, signatureHeader, STRIPE_WEBHOOK_SECRET)
  if (!isValid) {
    console.error('Invalid Stripe webhook signature')
    return new Response('Invalid signature', { status: 401 })
  }

  // Parse the event
  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(payload)
  } catch {
    return new Response('Invalid JSON payload', { status: 400 })
  }

  console.log(`Received Stripe event: ${event.type}`)

  // Route to the appropriate handler
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object)
      break
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  // Always return 200 so Stripe does not retry
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
