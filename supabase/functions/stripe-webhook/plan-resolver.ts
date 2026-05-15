/**
 * Pure resolver: maps a Stripe price ID + intended_plan metadata onto a
 * subscription tier. Lives in its own file so vitest (Node) can test it
 * without importing the Deno-only edge function entry.
 *
 * The webhook calls this with Stripe price IDs from env vars.
 */

// 'wholesale' is for reseller partners (e.g. Alphaflow). It's never produced
// by Stripe checkout — wholesale customers are manually provisioned via
// direct UPDATE in Supabase Studio + invoiced outside of Stripe Recurring.
// We include it here so types stay consistent with the profiles.plan CHECK.
export type Plan = 'free' | 'basic' | 'pro' | 'wholesale'

export interface PriceIdMap {
  basicMonthly: string
  basicAnnual: string
  proMonthly: string
  proAnnual: string
}

/**
 * Resolution order:
 *   1. Explicit env-mapped price ID → 'basic' or 'pro'.
 *   2. Caller-provided metadata fallback (`intended_plan` from create-checkout).
 *   3. Default to 'pro' — preserves the historical webhook behaviour for
 *      legacy Pro subscribers whose price ID may not be in env.
 */
export function resolvePlanFromPriceId(
  priceId: string | null | undefined,
  intendedPlanMetadata: string | null | undefined,
  prices: PriceIdMap,
): 'basic' | 'pro' {
  if (priceId) {
    if (priceId === prices.basicMonthly || priceId === prices.basicAnnual) return 'basic'
    if (priceId === prices.proMonthly || priceId === prices.proAnnual) return 'pro'
  }
  if (intendedPlanMetadata === 'basic') return 'basic'
  if (intendedPlanMetadata === 'pro') return 'pro'
  return 'pro' // legacy fallback — preserves historical behaviour
}

/** Pulls the first line item's price ID out of a Stripe subscription event. */
export function extractPriceId(subscription: Record<string, unknown>): string | null {
  const items = subscription.items as
    | { data?: Array<{ price?: { id?: string } }> }
    | undefined
  return items?.data?.[0]?.price?.id ?? null
}

export function extractIntendedPlan(obj: Record<string, unknown>): string | null {
  const metadata = obj.metadata as Record<string, string> | null
  return metadata?.intended_plan ?? null
}

/**
 * Map a Stripe subscription status to a Plan, or null if the status isn't
 * one we act on (e.g. `incomplete`, where the user hasn't paid yet).
 */
export function planFromSubscriptionStatus(
  status: string,
  resolvedActivePlan: 'basic' | 'pro',
): Plan | null {
  if (status === 'active' || status === 'trialing') return resolvedActivePlan
  if (['canceled', 'past_due', 'unpaid', 'incomplete_expired'].includes(status)) return 'free'
  return null
}
