import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTrialSubscriptionFromPayment,
  type TrialSessionInput,
  type TrialSubscriptionDeps,
} from '../trial-subscription'

/**
 * The function makes 3 sequential Stripe REST calls in order:
 *   1. GET  /payment_intents/:id          → resolve payment_method
 *   2. POST /customers/:id                → set default_payment_method
 *   3. POST /subscriptions                → create the trial subscription
 *
 * `mockStripeFetch` queues responses in that order and returns the captured
 * call log so individual tests can assert URL, method, body, and headers.
 */
type Call = {
  url: string
  method: string
  body: URLSearchParams
  headers: Record<string, string>
}

function mockStripeFetch(
  responses: Array<{ ok: boolean; body: Record<string, unknown> }>,
): { fetchFn: typeof fetch; calls: Call[] } {
  const calls: Call[] = []
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    const resp = responses.shift()
    if (!resp) throw new Error('mockStripeFetch: no response queued for call ' + (calls.length + 1))
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: new URLSearchParams((init?.body as string) || ''),
      headers: (init?.headers as Record<string, string>) || {},
    })
    return new Response(JSON.stringify(resp.body), {
      status: resp.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    }) as Response
  }) as typeof fetch
  return { fetchFn, calls }
}

const baseSession: TrialSessionInput = {
  id: 'cs_test_session_abc',
  customer: 'cus_test_123',
  payment_intent: 'pi_test_456',
  metadata: { user_id: 'user_xyz', checkout_plan: 'trial' },
}

function depsWith(fetchFn: typeof fetch): TrialSubscriptionDeps {
  return {
    stripeSecretKey: 'sk_test_dummy',
    basicMonthlyPriceId: 'price_basic_monthly_test',
    fetchFn,
  }
}

describe('createTrialSubscriptionFromPayment — happy path', () => {
  let calls: Call[]
  let subId: string

  beforeEach(async () => {
    const m = mockStripeFetch([
      { ok: true, body: { id: 'pi_test_456', payment_method: 'pm_test_789' } },
      { ok: true, body: { id: 'cus_test_123' } },
      { ok: true, body: { id: 'sub_test_abc', status: 'trialing' } },
    ])
    calls = m.calls
    subId = await createTrialSubscriptionFromPayment(depsWith(m.fetchFn), baseSession)
  })

  it('returns the created subscription id', () => {
    expect(subId).toBe('sub_test_abc')
  })

  it('makes exactly 3 Stripe API calls in the correct order', () => {
    expect(calls).toHaveLength(3)
    expect(calls[0].url).toBe('https://api.stripe.com/v1/payment_intents/pi_test_456')
    expect(calls[0].method).toBe('GET')
    expect(calls[1].url).toBe('https://api.stripe.com/v1/customers/cus_test_123')
    expect(calls[1].method).toBe('POST')
    expect(calls[2].url).toBe('https://api.stripe.com/v1/subscriptions')
    expect(calls[2].method).toBe('POST')
  })

  it('sets the saved payment method as the customer default', () => {
    expect(calls[1].body.get('invoice_settings[default_payment_method]')).toBe('pm_test_789')
  })

  it('creates the subscription with trial_period_days=7 and the Basic Monthly price', () => {
    const subBody = calls[2].body
    expect(subBody.get('customer')).toBe('cus_test_123')
    expect(subBody.get('items[0][price]')).toBe('price_basic_monthly_test')
    expect(subBody.get('trial_period_days')).toBe('7')
    expect(subBody.get('default_payment_method')).toBe('pm_test_789')
  })

  it('sets trial_settings.missing_payment_method=create_invoice so day 8 charges', () => {
    expect(calls[2].body.get('trial_settings[end_behavior][missing_payment_method]')).toBe('create_invoice')
  })

  it('forwards metadata onto the subscription so webhook handlers see context', () => {
    const subBody = calls[2].body
    expect(subBody.get('metadata[user_id]')).toBe('user_xyz')
    expect(subBody.get('metadata[intended_plan]')).toBe('basic')
    expect(subBody.get('metadata[checkout_plan]')).toBe('trial')
  })

  it('uses an Idempotency-Key derived from session.id on the subscription create', () => {
    expect(calls[2].headers['Idempotency-Key']).toBe('trial-sub-cs_test_session_abc')
  })

  it('does NOT send an Idempotency-Key on read-only (GET) calls', () => {
    expect(calls[0].headers['Idempotency-Key']).toBeUndefined()
  })

  it('authenticates every call with the Stripe secret', () => {
    for (const c of calls) {
      expect(c.headers.Authorization).toBe('Bearer sk_test_dummy')
    }
  })
})

describe('createTrialSubscriptionFromPayment — error paths', () => {
  it('throws if session has no customer', async () => {
    const m = mockStripeFetch([])
    await expect(
      createTrialSubscriptionFromPayment(depsWith(m.fetchFn), { ...baseSession, customer: null }),
    ).rejects.toThrow(/no customer/)
    expect(m.calls).toHaveLength(0)
  })

  it('throws if session has no payment_intent', async () => {
    const m = mockStripeFetch([])
    await expect(
      createTrialSubscriptionFromPayment(depsWith(m.fetchFn), { ...baseSession, payment_intent: null }),
    ).rejects.toThrow(/no payment_intent/)
    expect(m.calls).toHaveLength(0)
  })

  it('throws if Basic Monthly price ID is not configured', async () => {
    const m = mockStripeFetch([])
    await expect(
      createTrialSubscriptionFromPayment(
        { stripeSecretKey: 'sk', basicMonthlyPriceId: '', fetchFn: m.fetchFn },
        baseSession,
      ),
    ).rejects.toThrow(/STRIPE_BASIC_MONTHLY_PRICE_ID/)
    expect(m.calls).toHaveLength(0)
  })

  it('throws if PaymentIntent fetch fails (e.g. revoked secret key)', async () => {
    const m = mockStripeFetch([{ ok: false, body: { error: { message: 'Invalid API Key provided' } } }])
    await expect(
      createTrialSubscriptionFromPayment(depsWith(m.fetchFn), baseSession),
    ).rejects.toThrow(/failed to fetch payment_intent/)
  })

  it('throws if PaymentIntent has no payment_method (card not saved)', async () => {
    const m = mockStripeFetch([{ ok: true, body: { id: 'pi_test_456', payment_method: null } }])
    await expect(
      createTrialSubscriptionFromPayment(depsWith(m.fetchFn), baseSession),
    ).rejects.toThrow(/no payment_method/)
  })

  it('throws if customer update fails', async () => {
    const m = mockStripeFetch([
      { ok: true, body: { id: 'pi_test_456', payment_method: 'pm_test_789' } },
      { ok: false, body: { error: { message: 'No such customer' } } },
    ])
    await expect(
      createTrialSubscriptionFromPayment(depsWith(m.fetchFn), baseSession),
    ).rejects.toThrow(/failed to set default PM/)
  })

  it('throws if subscription create fails — webhook retry will re-run with same idempotency key', async () => {
    const m = mockStripeFetch([
      { ok: true, body: { id: 'pi_test_456', payment_method: 'pm_test_789' } },
      { ok: true, body: { id: 'cus_test_123' } },
      { ok: false, body: { error: { message: 'No such price' } } },
    ])
    await expect(
      createTrialSubscriptionFromPayment(depsWith(m.fetchFn), baseSession),
    ).rejects.toThrow(/failed to create subscription/)
  })
})

describe('createTrialSubscriptionFromPayment — defensive cases', () => {
  it('handles a session with no metadata.user_id (still creates subscription, just without that metadata key)', async () => {
    const m = mockStripeFetch([
      { ok: true, body: { id: 'pi_test_456', payment_method: 'pm_test_789' } },
      { ok: true, body: { id: 'cus_test_123' } },
      { ok: true, body: { id: 'sub_test_abc' } },
    ])
    const sessionWithoutUserId: TrialSessionInput = {
      ...baseSession,
      metadata: { checkout_plan: 'trial' },
    }
    await createTrialSubscriptionFromPayment(depsWith(m.fetchFn), sessionWithoutUserId)
    const subBody = m.calls[2].body
    expect(subBody.get('metadata[user_id]')).toBeNull()
    expect(subBody.get('metadata[intended_plan]')).toBe('basic')
  })
})
