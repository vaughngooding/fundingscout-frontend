/**
 * Single source of truth for subscription-based access control.
 *
 * Why this file exists: before 2026-04-29 the codebase had ~12 inline
 * `plan === 'free'` / `plan === 'pro'` checks scattered across pages and
 * components. With the introduction of Basic and the legacy_free
 * grandfathering policy, the access logic became too gnarly to inline
 * everywhere correctly. Centralising here means: one place to audit, one
 * place to test, one place to evolve.
 *
 * Hard rule: `canUseProFeatures` is exactly the existing `plan === 'pro'`
 * check. Pro behavior must NOT regress. New helpers are additive.
 */

import type { Profile } from './types'

export type AccessLevel = 'pro' | 'basic' | 'legacy_free' | 'paywalled'

/**
 * Categorise a profile into one of the four access levels.
 *
 * - `pro`: Active Pro subscriber. Full access to every feature.
 * - `basic`: Active Basic subscriber (or trialing — both share `plan='basic'`).
 *   Same feature access as legacy free (digest + dashboard + filters).
 * - `legacy_free`: Grandfathered free user from before the cutover.
 *   Same feature access as `basic`.
 * - `paywalled`: Cancelled/lapsed subscriber, or unauthenticated. No access
 *   to anything in the dashboard. Should be redirected to the onboarding
 *   plan-picker (`/onboarding?step=plan`).
 *
 * If `profile` is null (e.g. server component received no auth), the safe
 * answer is `paywalled` — the caller (middleware / layout guard) should
 * redirect to login or pricing.
 */
export function getAccessLevel(
  profile: Pick<Profile, 'plan' | 'legacy_free'> | null | undefined,
): AccessLevel {
  if (!profile) return 'paywalled'
  if (profile.plan === 'pro') return 'pro'
  if (profile.plan === 'basic') return 'basic'
  // plan === 'free'
  if (profile.legacy_free) return 'legacy_free'
  return 'paywalled'
}

/**
 * Pro-only features: real-time alerts, SMS, Slack/Teams/Telegram/Push,
 * bookmarks, CSV export. Identical semantics to the previous
 * `plan === 'pro'` check — preserved bit-for-bit.
 */
export function canUseProFeatures(
  profile: Pick<Profile, 'plan' | 'legacy_free'> | null | undefined,
): boolean {
  return getAccessLevel(profile) === 'pro'
}

/**
 * "Free-tier" features: email digest, dashboard, filters, 3-alert dashboard
 * preview. Available to legacy_free + basic + pro. NOT available to
 * paywalled users (they get redirected to pricing instead of even reaching
 * the dashboard).
 */
export function canUseBasicFeatures(
  profile: Pick<Profile, 'plan' | 'legacy_free'> | null | undefined,
): boolean {
  const lvl = getAccessLevel(profile)
  return lvl === 'pro' || lvl === 'basic' || lvl === 'legacy_free'
}

/**
 * Inverse of canUseBasicFeatures — used by the dashboard layout guard to
 * decide whether to redirect to /pricing.
 */
export function isPaywalled(
  profile: Pick<Profile, 'plan' | 'legacy_free'> | null | undefined,
): boolean {
  return getAccessLevel(profile) === 'paywalled'
}

/**
 * Human-readable upgrade target for UI copy.
 *
 * - paywalled  → "Subscribe" (no current entitlement)
 * - legacy_free → "Upgrade" (has access, can move to Basic or Pro)
 * - basic      → "Upgrade to Pro"
 * - pro        → null (no upgrade — they're at the top)
 */
export function upgradeCtaLabel(
  profile: Pick<Profile, 'plan' | 'legacy_free'> | null | undefined,
): string | null {
  switch (getAccessLevel(profile)) {
    case 'paywalled':
      return 'Subscribe'
    case 'legacy_free':
      return 'Upgrade'
    case 'basic':
      return 'Upgrade to Pro'
    case 'pro':
      return null
  }
}
