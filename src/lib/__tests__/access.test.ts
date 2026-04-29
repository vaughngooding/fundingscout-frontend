import { describe, it, expect } from 'vitest'
import {
  getAccessLevel,
  canUseProFeatures,
  canUseBasicFeatures,
  isPaywalled,
  upgradeCtaLabel,
} from '../access'
import type { Profile } from '../types'

// Minimal profile factory — the helpers only read `plan` and `legacy_free`.
function p(plan: Profile['plan'], legacy_free = false): Pick<Profile, 'plan' | 'legacy_free'> {
  return { plan, legacy_free }
}

describe('getAccessLevel', () => {
  it('returns "pro" for plan=pro regardless of legacy_free', () => {
    expect(getAccessLevel(p('pro'))).toBe('pro')
    expect(getAccessLevel(p('pro', true))).toBe('pro')
  })

  it('returns "basic" for plan=basic', () => {
    expect(getAccessLevel(p('basic'))).toBe('basic')
    expect(getAccessLevel(p('basic', true))).toBe('basic')
  })

  it('returns "legacy_free" for plan=free + legacy_free=true (grandfathered)', () => {
    expect(getAccessLevel(p('free', true))).toBe('legacy_free')
  })

  it('returns "paywalled" for plan=free + legacy_free=false (lapsed/cancelled)', () => {
    expect(getAccessLevel(p('free', false))).toBe('paywalled')
  })

  it('returns "paywalled" for null/undefined profile', () => {
    expect(getAccessLevel(null)).toBe('paywalled')
    expect(getAccessLevel(undefined)).toBe('paywalled')
  })
})

describe('canUseProFeatures (preserves existing plan==="pro" semantics)', () => {
  it('is true ONLY for pro', () => {
    expect(canUseProFeatures(p('pro'))).toBe(true)
    expect(canUseProFeatures(p('basic'))).toBe(false)
    expect(canUseProFeatures(p('free', true))).toBe(false)
    expect(canUseProFeatures(p('free', false))).toBe(false)
    expect(canUseProFeatures(null)).toBe(false)
  })
})

describe('canUseBasicFeatures (digest, dashboard, filters)', () => {
  it('is true for pro, basic, and legacy_free', () => {
    expect(canUseBasicFeatures(p('pro'))).toBe(true)
    expect(canUseBasicFeatures(p('basic'))).toBe(true)
    expect(canUseBasicFeatures(p('free', true))).toBe(true)
  })

  it('is false for paywalled and null', () => {
    expect(canUseBasicFeatures(p('free', false))).toBe(false)
    expect(canUseBasicFeatures(null)).toBe(false)
  })
})

describe('isPaywalled', () => {
  it('is true ONLY for paywalled (cancelled/null)', () => {
    expect(isPaywalled(p('free', false))).toBe(true)
    expect(isPaywalled(null)).toBe(true)
  })

  it('is false for pro/basic/legacy_free', () => {
    expect(isPaywalled(p('pro'))).toBe(false)
    expect(isPaywalled(p('basic'))).toBe(false)
    expect(isPaywalled(p('free', true))).toBe(false)
  })
})

describe('upgradeCtaLabel', () => {
  it('returns "Subscribe" for paywalled', () => {
    expect(upgradeCtaLabel(p('free', false))).toBe('Subscribe')
    expect(upgradeCtaLabel(null)).toBe('Subscribe')
  })

  it('returns "Upgrade" for legacy_free', () => {
    expect(upgradeCtaLabel(p('free', true))).toBe('Upgrade')
  })

  it('returns "Upgrade to Pro" for basic', () => {
    expect(upgradeCtaLabel(p('basic'))).toBe('Upgrade to Pro')
  })

  it('returns null for pro (already at top tier)', () => {
    expect(upgradeCtaLabel(p('pro'))).toBeNull()
  })
})
