import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // ---- Authenticate the user ----
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in first.' },
        { status: 401 }
      )
    }

    // ---- Build the Checkout session parameters ----
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const params = new URLSearchParams()
    params.append('mode', 'subscription')
    params.append('line_items[0][price]', process.env.STRIPE_PRO_PRICE_ID!)
    params.append('line_items[0][quantity]', '1')
    params.append('success_url', `${origin}/dashboard?upgraded=true`)
    params.append('cancel_url', `${origin}/settings`)
    params.append('customer_email', user.email!)
    params.append('metadata[user_id]', user.id)
    // Allow Stripe-managed promotion codes (created in Stripe Dashboard → Coupons / Promotion codes)
    params.append('allow_promotion_codes', 'true')

    // ---- Create the Stripe Checkout session via REST API ----
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.text()
      console.error('Stripe API error:', stripeResponse.status, errorBody)
      return NextResponse.json(
        { error: 'Failed to create checkout session. Please try again.' },
        { status: 502 }
      )
    }

    const session = await stripeResponse.json()

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('create-checkout: unexpected error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
