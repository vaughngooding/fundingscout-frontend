import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  resolvePlan,
  priceIdFor,
  intendedTierFor,
} from '@/lib/api/checkout-plan-helpers'

// ---- Mocks for the POST handler tests ----

// Supabase auth: every test below assumes a logged-in user.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null,
      })),
    },
  })),
}))

// next/server: the route only uses NextResponse.json — keep the rest.
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return actual
})

/**
 * Capture the body of the Stripe fetch so we can assert the request shape
 * without ever talking to the real Stripe API. Returns the URL-decoded
 * params Stripe would have received.
 */
function mockStripeFetch(
  responseBody: Record<string, unknown> = { url: 'https://checkout.stripe.com/c/pay/cs_test_123' },
  ok = true,
) {
  const captured: { body: URLSearchParams | null } = { body: null }
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
    captured.body = new URLSearchParams((init?.body as string) || '')
    return new Response(JSON.stringify(responseBody), {
      status: ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    }) as Response
  })
  return { captured, fetchSpy }
}

describe('resolvePlan', () => {
  it('passes canonical plans through unchanged', () => {
    expect(resolvePlan('trial')).toBe('trial')
    expect(resolvePlan('basic')).toBe('basic')
    expect(resolvePlan('basic-annual')).toBe('basic-annual')
    expect(resolvePlan('pro')).toBe('pro')
    expect(resolvePlan('pro-annual')).toBe('pro-annual')
  })

  it('maps legacy aliases (monthly/annual) to Pro variants', () => {
    expect(resolvePlan('monthly')).toBe('pro')
    expect(resolvePlan('annual')).toBe('pro-annual')
  })

  it('accepts underscore variants', () => {
    expect(resolvePlan('basic_annual')).toBe('basic-annual')
    expect(resolvePlan('pro_annual')).toBe('pro-annual')
  })

  it('is case-insensitive', () => {
    expect(resolvePlan('BASIC')).toBe('basic')
    expect(resolvePlan('Pro-Annual')).toBe('pro-annual')
  })

  it('returns null for unknown values', () => {
    expect(resolvePlan('free')).toBeNull()
    expect(resolvePlan('enterprise')).toBeNull()
    expect(resolvePlan('')).toBeNull()
  })
})

describe('intendedTierFor', () => {
  it('routes trial + basic + basic-annual to "basic"', () => {
    expect(intendedTierFor('trial')).toBe('basic')
    expect(intendedTierFor('basic')).toBe('basic')
    expect(intendedTierFor('basic-annual')).toBe('basic')
  })

  it('routes pro + pro-annual to "pro"', () => {
    expect(intendedTierFor('pro')).toBe('pro')
    expect(intendedTierFor('pro-annual')).toBe('pro')
  })
})

describe('priceIdFor — env-var dispatch', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_BASIC_MONTHLY_PRICE_ID', 'price_basic_monthly_test')
    vi.stubEnv('STRIPE_BASIC_ANNUAL_PRICE_ID', 'price_basic_annual_test')
    vi.stubEnv('STRIPE_PRO_PRICE_ID', 'price_pro_monthly_test')
    vi.stubEnv('STRIPE_PRO_ANNUAL_PRICE_ID', 'price_pro_annual_test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('trial uses Basic Monthly price (the trial subscribes to Basic under the hood)', () => {
    expect(priceIdFor('trial')).toBe('price_basic_monthly_test')
  })

  it('basic → Basic Monthly', () => {
    expect(priceIdFor('basic')).toBe('price_basic_monthly_test')
  })

  it('basic-annual → Basic Annual', () => {
    expect(priceIdFor('basic-annual')).toBe('price_basic_annual_test')
  })

  it('pro → Pro Monthly (UNCHANGED env var)', () => {
    expect(priceIdFor('pro')).toBe('price_pro_monthly_test')
  })

  it('pro-annual → Pro Annual (UNCHANGED env var)', () => {
    expect(priceIdFor('pro-annual')).toBe('price_pro_annual_test')
  })
})

describe('POST handler — Stripe request body shape', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy')
    vi.stubEnv('STRIPE_BASIC_MONTHLY_PRICE_ID', 'price_basic_monthly_test')
    vi.stubEnv('STRIPE_BASIC_ANNUAL_PRICE_ID', 'price_basic_annual_test')
    vi.stubEnv('STRIPE_PRO_PRICE_ID', 'price_pro_monthly_test')
    vi.stubEnv('STRIPE_PRO_ANNUAL_PRICE_ID', 'price_pro_annual_test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  async function callRoute(plan: string) {
    const { POST } = await import('../route')
    const { captured } = mockStripeFetch()
    const req = new Request('https://example.com/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    // The route uses NextRequest, but Request is structurally compatible for
    // .url, .headers, and .json(). Cast to satisfy TypeScript.
    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(captured.body).not.toBeNull()
    return captured.body!
  }

  describe('trial plan', () => {
    it('uses mode=payment (NOT subscription) — the subscription is created later by the webhook', async () => {
      const body = await callRoute('trial')
      expect(body.get('mode')).toBe('payment')
    })

    it('charges $2.99 once via inline price_data', async () => {
      const body = await callRoute('trial')
      expect(body.get('line_items[0][price_data][currency]')).toBe('usd')
      expect(body.get('line_items[0][price_data][unit_amount]')).toBe('299')
      expect(body.get('line_items[0][price_data][product_data][name]')).toBe('FundingScout 7-day Trial')
      expect(body.get('line_items[0][quantity]')).toBe('1')
    })

    it('saves the card for future $19.99 charges', async () => {
      const body = await callRoute('trial')
      expect(body.get('payment_intent_data[setup_future_usage]')).toBe('off_session')
    })

    it('forces customer creation so the webhook can attach the subscription', async () => {
      const body = await callRoute('trial')
      expect(body.get('customer_creation')).toBe('always')
    })

    it('tags metadata for webhook routing', async () => {
      const body = await callRoute('trial')
      expect(body.get('metadata[user_id]')).toBe('user_123')
      expect(body.get('metadata[checkout_plan]')).toBe('trial')
      expect(body.get('metadata[intended_plan]')).toBe('basic')
      expect(body.get('payment_intent_data[metadata][user_id]')).toBe('user_123')
      expect(body.get('payment_intent_data[metadata][checkout_plan]')).toBe('trial')
    })

    it('does NOT use the Stripe parameters that broke the original implementation', async () => {
      const body = await callRoute('trial')
      // add_invoice_items: rejected by Stripe Checkout Session API.
      expect(body.get('subscription_data[add_invoice_items][0][price_data][currency]')).toBeNull()
      // trial_period_days: belongs on Subscription create, not Checkout for this flow.
      expect(body.get('subscription_data[trial_period_days]')).toBeNull()
      // billing_cycle_anchor: previously-considered approach, behavior unverified.
      expect(body.get('subscription_data[billing_cycle_anchor]')).toBeNull()
      // No subscription_data at all on a payment-mode session.
      expect(body.get('subscription_data[metadata][user_id]')).toBeNull()
    })
  })

  describe('non-trial plans', () => {
    it.each([
      ['basic', 'price_basic_monthly_test'],
      ['basic-annual', 'price_basic_annual_test'],
      ['pro', 'price_pro_monthly_test'],
      ['pro-annual', 'price_pro_annual_test'],
    ])('plan=%s uses mode=subscription with the right recurring price', async (plan, expectedPrice) => {
      const body = await callRoute(plan)
      expect(body.get('mode')).toBe('subscription')
      expect(body.get('line_items[0][price]')).toBe(expectedPrice)
      expect(body.get('payment_method_collection')).toBe('always')
      // No payment_intent_data on subscription mode.
      expect(body.get('payment_intent_data[setup_future_usage]')).toBeNull()
      // Subscription-side metadata so webhook handlers see context on lifecycle events.
      expect(body.get('subscription_data[metadata][user_id]')).toBe('user_123')
      expect(body.get('subscription_data[metadata][checkout_plan]')).toBe(plan)
    })
  })
})
