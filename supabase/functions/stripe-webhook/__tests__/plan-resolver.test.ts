import { describe, it, expect } from 'vitest'
import {
  resolvePlanFromPriceId,
  extractPriceId,
  extractIntendedPlan,
  planFromSubscriptionStatus,
  type PriceIdMap,
} from '../plan-resolver'

const PRICES: PriceIdMap = {
  basicMonthly: 'price_basic_monthly',
  basicAnnual: 'price_basic_annual',
  proMonthly: 'price_pro_monthly',
  proAnnual: 'price_pro_annual',
}

describe('resolvePlanFromPriceId', () => {
  it('routes Basic Monthly + Annual price IDs to "basic"', () => {
    expect(resolvePlanFromPriceId('price_basic_monthly', null, PRICES)).toBe('basic')
    expect(resolvePlanFromPriceId('price_basic_annual', null, PRICES)).toBe('basic')
  })

  it('routes Pro Monthly + Annual price IDs to "pro"', () => {
    expect(resolvePlanFromPriceId('price_pro_monthly', null, PRICES)).toBe('pro')
    expect(resolvePlanFromPriceId('price_pro_annual', null, PRICES)).toBe('pro')
  })

  it('falls back to intended_plan metadata when price ID is unknown', () => {
    expect(resolvePlanFromPriceId('price_unknown', 'basic', PRICES)).toBe('basic')
    expect(resolvePlanFromPriceId('price_unknown', 'pro', PRICES)).toBe('pro')
  })

  it('falls back to intended_plan when price ID is missing', () => {
    expect(resolvePlanFromPriceId(null, 'basic', PRICES)).toBe('basic')
    expect(resolvePlanFromPriceId(undefined, 'pro', PRICES)).toBe('pro')
  })

  it('defaults to "pro" when nothing matches (preserves legacy webhook behaviour for old Pro subs)', () => {
    expect(resolvePlanFromPriceId(null, null, PRICES)).toBe('pro')
    expect(resolvePlanFromPriceId('price_unknown', null, PRICES)).toBe('pro')
    expect(resolvePlanFromPriceId('', '', PRICES)).toBe('pro')
  })

  it('prefers explicit price match over metadata (price ID is more authoritative)', () => {
    // Hypothetical: a user upgrades Basic→Pro via Customer Portal. The
    // subscription metadata may still say intended_plan='basic' from signup,
    // but the new price ID is Pro. Price wins.
    expect(resolvePlanFromPriceId('price_pro_monthly', 'basic', PRICES)).toBe('pro')
    expect(resolvePlanFromPriceId('price_basic_monthly', 'pro', PRICES)).toBe('basic')
  })
})

describe('extractPriceId', () => {
  it('reads items.data[0].price.id from a Stripe subscription event', () => {
    const sub = {
      items: { data: [{ price: { id: 'price_pro_monthly' } }] },
    }
    expect(extractPriceId(sub)).toBe('price_pro_monthly')
  })

  it('returns null when items are missing', () => {
    expect(extractPriceId({})).toBeNull()
    expect(extractPriceId({ items: {} })).toBeNull()
    expect(extractPriceId({ items: { data: [] } })).toBeNull()
    expect(extractPriceId({ items: { data: [{}] } })).toBeNull()
  })
})

describe('extractIntendedPlan', () => {
  it('reads metadata.intended_plan', () => {
    expect(extractIntendedPlan({ metadata: { intended_plan: 'basic' } })).toBe('basic')
    expect(extractIntendedPlan({ metadata: { intended_plan: 'pro' } })).toBe('pro')
  })

  it('returns null when metadata is missing or empty', () => {
    expect(extractIntendedPlan({})).toBeNull()
    expect(extractIntendedPlan({ metadata: null })).toBeNull()
    expect(extractIntendedPlan({ metadata: {} })).toBeNull()
  })
})

describe('planFromSubscriptionStatus', () => {
  it('treats trialing as a fully entitled state (returns the resolved plan)', () => {
    expect(planFromSubscriptionStatus('trialing', 'basic')).toBe('basic')
    expect(planFromSubscriptionStatus('trialing', 'pro')).toBe('pro')
  })

  it('treats active as a fully entitled state', () => {
    expect(planFromSubscriptionStatus('active', 'basic')).toBe('basic')
    expect(planFromSubscriptionStatus('active', 'pro')).toBe('pro')
  })

  it('drops to free for cancelled / past_due / unpaid / incomplete_expired', () => {
    expect(planFromSubscriptionStatus('canceled', 'pro')).toBe('free')
    expect(planFromSubscriptionStatus('past_due', 'pro')).toBe('free')
    expect(planFromSubscriptionStatus('unpaid', 'basic')).toBe('free')
    expect(planFromSubscriptionStatus('incomplete_expired', 'basic')).toBe('free')
  })

  it('returns null for indeterminate states (skip the update)', () => {
    expect(planFromSubscriptionStatus('incomplete', 'pro')).toBeNull()
    expect(planFromSubscriptionStatus('paused', 'pro')).toBeNull()
  })
})
