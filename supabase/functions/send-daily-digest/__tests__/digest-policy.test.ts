import { describe, it, expect } from 'vitest'
import { shouldSendDigest, digestAlertLimit } from '../digest-policy'

describe('shouldSendDigest', () => {
  it('skips paywalled users (plan=free, legacy_free=false)', () => {
    // A new signup who cancelled their Stripe sub — no longer entitled.
    expect(shouldSendDigest('free', false)).toBe(false)
  })

  it('sends to legacy free users (plan=free, legacy_free=true)', () => {
    // Grandfathered users from before the cutover keep the digest.
    expect(shouldSendDigest('free', true)).toBe(true)
  })

  it('sends to Basic subscribers', () => {
    expect(shouldSendDigest('basic', false)).toBe(true)
  })

  it('sends to Pro subscribers (UNCHANGED)', () => {
    expect(shouldSendDigest('pro', false)).toBe(true)
    // legacy_free flag is irrelevant for Pro — they're entitled either way.
    expect(shouldSendDigest('pro', true)).toBe(true)
  })
})

describe('digestAlertLimit', () => {
  it('returns 50 for Pro (UNCHANGED behaviour)', () => {
    expect(digestAlertLimit('pro')).toBe(50)
  })

  it('returns 10 for Basic', () => {
    // Basic gets the same cap legacy free users had — we're charging for
    // what was free, but with the same allotment.
    expect(digestAlertLimit('basic')).toBe(10)
  })

  it('returns 10 for legacy free', () => {
    expect(digestAlertLimit('free')).toBe(10)
  })
})
