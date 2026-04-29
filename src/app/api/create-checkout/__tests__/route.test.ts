import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { __testHelpers } from '../route'

const { resolvePlan, priceIdFor, intendedTierFor } = __testHelpers

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
