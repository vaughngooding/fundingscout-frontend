/**
 * Pure digest-policy helpers — extracted so vitest can test them.
 *
 * Encodes the post-2026-04-29 rules for who gets the daily/weekly digest
 * and how many alerts they're capped at.
 */

export type DigestPlan = 'free' | 'basic' | 'pro' | string

/**
 * Should this user receive a digest at all?
 *
 * Rules:
 *   - paywalled (plan='free' AND legacy_free=false) → NO digest. They
 *     cancelled their subscription; they don't get free email anymore.
 *   - legacy_free, basic, pro                       → YES.
 */
export function shouldSendDigest(plan: DigestPlan, legacyFree: boolean): boolean {
  if (plan === 'free' && !legacyFree) return false
  return true
}

/**
 * How many alerts to include in the digest.
 *
 *   - pro                  → 50 (unchanged from before)
 *   - basic + legacy_free  → 10 (matches the old "free user" cap)
 *   - paywalled            → never reaches here (shouldSendDigest=false)
 */
export function digestAlertLimit(plan: DigestPlan): number {
  return plan === 'pro' ? 50 : 10
}
