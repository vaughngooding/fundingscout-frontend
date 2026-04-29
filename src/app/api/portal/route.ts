import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Create a Stripe Customer Portal session for the logged-in user.
 *
 * Returns `{ url }` for the front-end to redirect to. The portal is where
 * users can:
 *   - Update payment method
 *   - Cancel subscription (during trial OR after)
 *   - Upgrade Basic → Pro / downgrade Pro → Basic
 *   - Switch between monthly and annual
 *   - Download invoices
 *
 * Requires `profile.stripe_customer_id` to be set — that's populated by the
 * stripe-webhook on `checkout.session.completed`. If missing, the user has
 * never completed checkout (e.g. legacy free user) and we tell them to
 * subscribe first.
 *
 * The Stripe portal config (allowed actions, branding) is configured once
 * in the Stripe Dashboard → Settings → Billing → Customer portal.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('portal: failed to load profile', profileError)
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    if (!profile.stripe_customer_id) {
      // Legacy free users / never-checked-out users have no Stripe customer
      // record. Direct them to /pricing to start a subscription.
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.', redirect: '/pricing' },
        { status: 400 },
      )
    }

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    const params = new URLSearchParams()
    params.append('customer', profile.stripe_customer_id)
    params.append('return_url', `${origin}/settings`)

    const stripeResponse = await fetch(
      'https://api.stripe.com/v1/billing_portal/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    )

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.text()
      console.error('portal: Stripe API error', stripeResponse.status, errorBody)
      return NextResponse.json(
        { error: 'Failed to create portal session.' },
        { status: 502 },
      )
    }

    const session = await stripeResponse.json()
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('portal: unexpected error', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
