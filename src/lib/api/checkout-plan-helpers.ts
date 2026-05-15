/**
 * Pure helpers used by the /api/create-checkout route. Extracted into
 * src/lib/api so that vitest can import them without going through
 * Next.js's strict Route export validation (which only allows GET/POST/
 * runtime/dynamic/etc. — and rejects extra exports like `__testHelpers`).
 */

export type CanonicalPlan = 'trial' | 'basic' | 'basic-annual' | 'pro' | 'pro-annual'

const PLAN_ALIASES: Record<string, CanonicalPlan> = {
  trial: 'trial',
  basic: 'basic',
  'basic-annual': 'basic-annual',
  'basic_annual': 'basic-annual',
  pro: 'pro',
  'pro-annual': 'pro-annual',
  'pro_annual': 'pro-annual',
  // legacy aliases the old onboarding flow used:
  monthly: 'pro',
  annual: 'pro-annual',
}

export function resolvePlan(input: string): CanonicalPlan | null {
  return PLAN_ALIASES[input.toLowerCase()] ?? null
}

export function priceIdFor(plan: CanonicalPlan): string | undefined {
  switch (plan) {
    case 'trial':
    case 'basic':
      return process.env.STRIPE_BASIC_MONTHLY_PRICE_ID
    case 'basic-annual':
      return process.env.STRIPE_BASIC_ANNUAL_PRICE_ID
    case 'pro':
      return process.env.STRIPE_PRO_PRICE_ID
    case 'pro-annual':
      return process.env.STRIPE_PRO_ANNUAL_PRICE_ID
  }
}

/** Used by the webhook to record which tier the user signed up for. */
export function intendedTierFor(plan: CanonicalPlan): 'basic' | 'pro' {
  return plan === 'pro' || plan === 'pro-annual' ? 'pro' : 'basic'
}
