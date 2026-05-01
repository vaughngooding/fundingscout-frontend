import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Create a Stripe Checkout session for one of the supported plans.
 *
 * Plan param accepts (query string OR JSON body):
 *
 *   - 'trial'        → Basic Monthly price + 7-day trial + $2.99 setup fee.
 *                      Card required upfront; auto-converts to Basic Monthly
 *                      ($19.99) on day 8 unless cancelled.
 *   - 'basic'        → Basic Monthly recurring ($19.99/mo).
 *   - 'basic-annual' → Basic Annual recurring ($99/yr).
 *   - 'pro'          → Pro Monthly recurring ($89/mo).      [UNCHANGED behaviour]
 *   - 'pro-annual'   → Pro Annual recurring ($588/yr).      [UNCHANGED behaviour]
 *
 * Backward-compat with the old onboarding URLs:
 *   - 'monthly'      → 'pro'        (legacy alias)
 *   - 'annual'       → 'pro-annual' (legacy alias)
 *
 * The session metadata records `intended_plan` (`basic` or `pro`) so the
 * webhook can disambiguate even before price IDs are inspected.
 */

type CanonicalPlan = 'trial' | 'basic' | 'basic-annual' | 'pro' | 'pro-annual'

const PLAN_ALIASES: Record<string, CanonicalPlan> = {
  trial: 'trial',
  basic: 'basic',
  'basic-annual': 'basic-annual',
  'basic_annual': 'basic-annual',
  pro: 'pro',
  'pro-annual': 'pro-annual',
  'pro_annual': 'pro-annual',
  // legacy aliases that the old onboarding flow used:
  monthly: 'pro',
  annual: 'pro-annual',
}

function resolvePlan(input: string): CanonicalPlan | null {
  return PLAN_ALIASES[input.toLowerCase()] ?? null
}

function priceIdFor(plan: CanonicalPlan): string | undefined {
  switch (plan) {
    // Trial subscribes to Basic Monthly under the hood — the $2.99 charge is
    // a one-time invoice item, the 7-day trial defers the recurring charge.
    case 'trial':
    case 'basic':
      return process.env.STRIPE_BASIC_MONTHLY_PRICE_ID
    case 'basic-annual':
      return process.env.STRIPE_BASIC_ANNUAL_PRICE_ID
    case 'pro':
      return process.env.STRIPE_PRO_PRICE_ID
    case 'pro-annual':
      return process.env.STRIPE_PRO_ANNUAL_PRICE_ID
  }
}

/** Used by the webhook to record which tier the user signed up for. */
function intendedTierFor(plan: CanonicalPlan): 'basic' | 'pro' {
  return plan === 'pro' || plan === 'pro-annual' ? 'pro' : 'basic'
}

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
        { status: 401 },
      )
    }

    // ---- Resolve the requested plan ----
    const url = new URL(request.url)
    let planInput = url.searchParams.get('plan') || ''
    if (!planInput) {
      try {
        const body = await request.json()
        planInput = body?.plan || ''
      } catch {
        // body is empty or not JSON — fall through to default
      }
    }
    if (!planInput) planInput = 'trial' // default to lowest-friction entry

    const plan = resolvePlan(planInput)
    if (!plan) {
      return NextResponse.json(
        { error: `Unknown plan "${planInput}". Use one of: trial, basic, basic-annual, pro, pro-annual.` },
        { status: 400 },
      )
    }

    const priceId = priceIdFor(plan)
    if (!priceId) {
      console.error('create-checkout: missing Stripe price ID env var for plan', plan)
      return NextResponse.json(
        { error: 'Pricing not configured on the server.' },
        { status: 500 },
      )
    }

    // ---- Build Stripe Checkout session params ----
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    const params = new URLSearchParams()
    params.append('success_url', `${origin}/dashboard?upgraded=true&plan=${plan}`)
    params.append('cancel_url', `${origin}/onboarding?step=plan`)
    params.append('customer_email', user.email!)
    params.append('metadata[user_id]', user.id)
    params.append('metadata[intended_plan]', intendedTierFor(plan))
    params.append('metadata[checkout_plan]', plan)
    params.append('allow_promotion_codes', 'true')

    if (plan === 'trial') {
      // Two-step "$2.99 today, 7-day access, then $19.99/mo" flow:
      //   1. This Checkout Session uses mode=payment to charge $2.99 ONCE and
      //      save the card via setup_future_usage. No subscription is created
      //      here.
      //   2. On checkout.session.completed (mode=payment + checkout_plan=trial),
      //      the Stripe webhook creates the Basic Monthly subscription with
      //      trial_period_days=7 and the saved payment method, so day 8 charges
      //      $19.99 automatically.
      //
      // Why not a single mode=subscription session?
      //   Stripe Checkout's subscription mode bills line items on the FIRST
      //   invoice, which is at trial_end with trial_period_days. So an upfront
      //   $2.99 charge on day 0 isn't expressible as a single Checkout call.
      //   The previous attempt used subscription_data[add_invoice_items] —
      //   that parameter exists on the Subscription API but NOT on Checkout
      //   Session, and Stripe rejected the request with parameter_unknown.
      params.append('mode', 'payment')
      params.append('line_items[0][price_data][currency]', 'usd')
      params.append('line_items[0][price_data][unit_amount]', '299')
      params.append('line_items[0][price_data][product_data][name]', 'FundingScout 7-day Trial')
      params.append('line_items[0][quantity]', '1')
      // Save the card so the webhook can attach it to the subscription it
      // creates after this session completes.
      params.append('payment_intent_data[setup_future_usage]', 'off_session')
      // Mirror identifying metadata onto the PaymentIntent so refund / dispute
      // events carry user context even before the subscription exists.
      params.append('payment_intent_data[metadata][user_id]', user.id)
      params.append('payment_intent_data[metadata][checkout_plan]', 'trial')
      // Force a Stripe Customer record — the webhook needs a customer_id to
      // attach the Subscription it creates next.
      params.append('customer_creation', 'always')
    } else {
      params.append('mode', 'subscription')
      params.append('line_items[0][price]', priceId)
      params.append('line_items[0][quantity]', '1')
      // Card required upfront on every paid plan.
      params.append('payment_method_collection', 'always')
      // Pass the same identifying metadata onto the subscription so webhook
      // handlers see it on every subscription lifecycle event.
      params.append('subscription_data[metadata][user_id]', user.id)
      params.append('subscription_data[metadata][intended_plan]', intendedTierFor(plan))
      params.append('subscription_data[metadata][checkout_plan]', plan)
    }

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
        { status: 502 },
      )
    }

    const session = await stripeResponse.json()
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('create-checkout: unexpected error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// Exported for tests — keeps the Stripe-form-encoded helpers verifiable
// without spinning up the route handler.
export const __testHelpers = { resolvePlan, priceIdFor, intendedTierFor }
