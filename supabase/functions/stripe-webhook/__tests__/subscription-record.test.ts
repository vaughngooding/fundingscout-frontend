import { describe, it, expect } from 'vitest'
import {
  mapStripeSubscription,
  describePaymentError,
  idOf,
  unixToIso,
} from '../subscription-record'
import type { PriceIdMap } from '../plan-resolver'

const PRICES: PriceIdMap = {
  basicMonthly: 'price_basic_monthly',
  basicAnnual: 'price_basic_annual',
  proMonthly: 'price_pro_monthly',
  proAnnual: 'price_pro_annual',
}

const NOW = new Date('2026-11-12T17:00:00Z')

// Minimal but realistic Stripe subscription shape (pre-2025-03-31 API:
// current_period_* at top level).
function stripeSub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_123',
    object: 'subscription',
    customer: 'cus_abc',
    status: 'active',
    created: 1762966800, // 2025-11-12T17:00:00Z
    current_period_start: 1762966800,
    current_period_end: 1765558800,
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    ended_at: null,
    trial_start: null,
    trial_end: null,
    cancellation_details: { comment: null, feedback: null, reason: null },
    metadata: { user_id: 'user-1', intended_plan: 'basic' },
    items: {
      data: [
        {
          id: 'si_1',
          price: {
            id: 'price_basic_monthly',
            unit_amount: 1999,
            currency: 'usd',
            recurring: { interval: 'month', interval_count: 1 },
          },
        },
      ],
    },
    ...overrides,
  }
}

describe('mapStripeSubscription', () => {
  it('maps an active Basic monthly subscription', () => {
    const row = mapStripeSubscription(stripeSub(), PRICES, 'user-1', NOW)
    expect(row).toMatchObject({
      id: 'sub_123',
      user_id: 'user-1',
      stripe_customer_id: 'cus_abc',
      status: 'active',
      plan: 'basic',
      billing_interval: 'month',
      price_id: 'price_basic_monthly',
      amount_cents: 1999,
      currency: 'usd',
      is_trial_origin: false,
      cancel_at_period_end: false,
      synced_at: NOW.toISOString(),
    })
    expect(row.current_period_end).toBe('2025-12-12T17:00:00.000Z')
    expect(row.stripe_created_at).toBe('2025-11-12T17:00:00.000Z')
  })

  it('maps Pro annual by price ID and reads a customer given as an object', () => {
    const row = mapStripeSubscription(
      stripeSub({
        customer: { id: 'cus_obj', object: 'customer' },
        items: {
          data: [
            {
              price: {
                id: 'price_pro_annual',
                unit_amount: 58800,
                currency: 'usd',
                recurring: { interval: 'year' },
              },
            },
          ],
        },
        metadata: {},
      }),
      PRICES,
      null,
      NOW,
    )
    expect(row.plan).toBe('pro')
    expect(row.billing_interval).toBe('year')
    expect(row.amount_cents).toBe(58800)
    expect(row.stripe_customer_id).toBe('cus_obj')
    expect(row.user_id).toBeNull()
  })

  it('flags the $2.99 trial flow and carries trial dates', () => {
    const row = mapStripeSubscription(
      stripeSub({
        status: 'trialing',
        trial_start: 1762966800,
        trial_end: 1763571600,
        metadata: { user_id: 'u', intended_plan: 'basic', checkout_plan: 'trial' },
      }),
      PRICES,
      'u',
      NOW,
    )
    expect(row.status).toBe('trialing')
    expect(row.is_trial_origin).toBe(true)
    expect(row.trial_end).toBe('2025-11-19T17:00:00.000Z')
  })

  it('carries cancellation details when a cancel is scheduled', () => {
    const row = mapStripeSubscription(
      stripeSub({
        cancel_at_period_end: true,
        cancel_at: 1765558800,
        canceled_at: 1764000000,
        cancellation_details: { reason: 'cancellation_requested', feedback: 'too_expensive', comment: 'Not using it' },
      }),
      PRICES,
      'u',
      NOW,
    )
    expect(row.cancel_at_period_end).toBe(true)
    expect(row.cancel_at).toBe('2025-12-12T17:00:00.000Z')
    expect(row.canceled_at).not.toBeNull()
    expect(row.cancellation_reason).toBe('cancellation_requested')
    expect(row.cancellation_feedback).toBe('too_expensive')
    expect(row.cancellation_comment).toBe('Not using it')
  })

  it('reads current_period_* from items[] on the 2025-03-31+ API shape', () => {
    const row = mapStripeSubscription(
      stripeSub({
        current_period_start: undefined,
        current_period_end: undefined,
        items: {
          data: [
            {
              current_period_start: 1762966800,
              current_period_end: 1765558800,
              price: {
                id: 'price_basic_monthly',
                unit_amount: 1999,
                currency: 'usd',
                recurring: { interval: 'month' },
              },
            },
          ],
        },
      }),
      PRICES,
      'u',
      NOW,
    )
    expect(row.current_period_end).toBe('2025-12-12T17:00:00.000Z')
  })

  it('does not crash on a sparse object and collapses unknown intervals to null', () => {
    const row = mapStripeSubscription(
      { id: 'sub_x', customer: 'cus_x', status: 'canceled', items: { data: [{ price: { id: 'p', recurring: { interval: 'week' } } }] } },
      PRICES,
      null,
      NOW,
    )
    expect(row.status).toBe('canceled')
    expect(row.billing_interval).toBeNull()
    expect(row.amount_cents).toBeNull()
    expect(row.plan).toBe('pro') // legacy fallback from plan-resolver
  })
})

describe('describePaymentError', () => {
  it('formats code / decline_code — message', () => {
    expect(
      describePaymentError({
        last_payment_error: {
          code: 'card_declined',
          decline_code: 'insufficient_funds',
          message: 'Your card has insufficient funds.',
        },
      }),
    ).toBe('card_declined / insufficient_funds — Your card has insufficient funds.')
  })

  it('returns null when there is no error', () => {
    expect(describePaymentError({ last_payment_error: null })).toBeNull()
    expect(describePaymentError(null)).toBeNull()
  })
})

describe('helpers', () => {
  it('idOf accepts ids and expanded objects', () => {
    expect(idOf('cus_1')).toBe('cus_1')
    expect(idOf({ id: 'cus_2' })).toBe('cus_2')
    expect(idOf(null)).toBeNull()
    expect(idOf(42)).toBeNull()
  })
  it('unixToIso handles seconds and rejects garbage', () => {
    expect(unixToIso(0)).toBe('1970-01-01T00:00:00.000Z')
    expect(unixToIso('1762966800')).toBeNull()
    expect(unixToIso(null)).toBeNull()
  })
})
