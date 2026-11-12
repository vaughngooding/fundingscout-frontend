/**
 * Maps a Stripe Subscription object onto a public.subscriptions row.
 *
 * Pure module — no Deno globals, no network — so vitest can cover it. Used by
 * stripe-webhook (real-time events) and billing-sync (hourly reconcile).
 *
 * Shape notes on the Stripe object:
 *   - items.data[0].price is always an inline Price object on subscriptions
 *     (no expand needed), carrying id / unit_amount / currency / recurring.
 *   - current_period_{start,end} are top-level on API versions < 2025-03-31
 *     and live on items.data[] from 2025-03-31 onward. We read both.
 *   - cancellation_details { reason, feedback, comment } is present once a
 *     cancellation has been requested or completed.
 *   - Timestamps are unix seconds.
 */

import { resolvePlanFromPriceId, type PriceIdMap } from './plan-resolver.ts'

export interface SubscriptionRow {
  id: string
  user_id: string | null
  stripe_customer_id: string
  status: string
  plan: 'basic' | 'pro'
  billing_interval: 'month' | 'year' | null
  price_id: string | null
  amount_cents: number | null
  currency: string | null
  is_trial_origin: boolean
  trial_start: string | null
  trial_end: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancel_at: string | null
  canceled_at: string | null
  ended_at: string | null
  cancellation_reason: string | null
  cancellation_feedback: string | null
  cancellation_comment: string | null
  stripe_created_at: string | null
  synced_at: string
}

type Obj = Record<string, unknown>

function asObj(v: unknown): Obj | null {
  return v && typeof v === 'object' ? (v as Obj) : null
}

/** Stripe fields are either an id string or an expanded object with .id */
export function idOf(v: unknown): string | null {
  if (typeof v === 'string') return v
  const o = asObj(v)
  return typeof o?.id === 'string' ? o.id : null
}

export function unixToIso(v: unknown): string | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return new Date(v * 1000).toISOString()
}

function intervalOf(price: Obj | null): 'month' | 'year' | null {
  const rec = asObj(price?.recurring)
  const i = rec?.interval
  if (i === 'month' || i === 'year') return i
  // week/day aren't sold; collapse anything else to null rather than guess.
  return null
}

export function mapStripeSubscription(
  sub: Obj,
  prices: PriceIdMap,
  userId: string | null,
  now: Date = new Date(),
): SubscriptionRow {
  const items = asObj(sub.items)
  const firstItem = asObj((items?.data as unknown[] | undefined)?.[0])
  const price = asObj(firstItem?.price)
  const priceId = typeof price?.id === 'string' ? price.id : null

  const metadata = asObj(sub.metadata)
  const intended = typeof metadata?.intended_plan === 'string' ? metadata.intended_plan : null
  const plan = resolvePlanFromPriceId(priceId, intended, prices)

  const cancellation = asObj(sub.cancellation_details)
  const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null)

  return {
    id: sub.id as string,
    user_id: userId,
    stripe_customer_id: idOf(sub.customer) ?? '',
    status: String(sub.status ?? 'unknown'),
    plan,
    billing_interval: intervalOf(price),
    price_id: priceId,
    amount_cents: typeof price?.unit_amount === 'number' ? price.unit_amount : null,
    currency: str(price?.currency),
    is_trial_origin: metadata?.checkout_plan === 'trial',
    trial_start: unixToIso(sub.trial_start),
    trial_end: unixToIso(sub.trial_end),
    current_period_start:
      unixToIso(sub.current_period_start) ?? unixToIso(firstItem?.current_period_start),
    current_period_end:
      unixToIso(sub.current_period_end) ?? unixToIso(firstItem?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end === true,
    cancel_at: unixToIso(sub.cancel_at),
    canceled_at: unixToIso(sub.canceled_at),
    ended_at: unixToIso(sub.ended_at),
    cancellation_reason: str(cancellation?.reason),
    cancellation_feedback: str(cancellation?.feedback),
    cancellation_comment: str(cancellation?.comment),
    stripe_created_at: unixToIso(sub.created),
    synced_at: now.toISOString(),
  }
}

/**
 * Human-readable decline reason from a PaymentIntent's last_payment_error.
 * e.g. "card_declined / insufficient_funds — Your card has insufficient funds."
 */
export function describePaymentError(paymentIntent: Obj | null): string | null {
  const err = asObj(paymentIntent?.last_payment_error)
  if (!err) return null
  const code = typeof err.code === 'string' ? err.code : null
  const decline = typeof err.decline_code === 'string' ? err.decline_code : null
  const message = typeof err.message === 'string' ? err.message : null
  const head = [code, decline].filter(Boolean).join(' / ')
  if (head && message) return `${head} — ${message}`
  return head || message || null
}
