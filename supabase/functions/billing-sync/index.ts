/**
 * billing-sync — reconcile every Stripe subscription into public.subscriptions.
 *
 * Why this exists: the Stripe webhook is the real-time path, but a single
 * dropped / misconfigured event leaves the DB wrong forever (that is exactly
 * what happened before 2026-11-12: cancellations never reached us). This
 * function makes the DB converge on Stripe truth regardless.
 *
 * Runs:
 *   - hourly from pg_cron via public.call_billing_sync()
 *   - once by hand for the initial backfill
 *
 * Auth: X-Billing-Sync-Token header, verified against the vault secret via
 * public.verify_billing_sync_token() (service_role-only RPC). verify_jwt is
 * off because pg_net can't mint a Supabase JWT; the token is the auth.
 *
 * Side effects happen in the DB triggers (billing_events, Slack alerts,
 * profiles.plan reconcile) — this function only upserts rows.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { PriceIdMap } from './plan-resolver.ts'
import { mapStripeSubscription, idOf } from './subscription-record.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PRICES: PriceIdMap = {
  basicMonthly: Deno.env.get('STRIPE_BASIC_MONTHLY_PRICE_ID') || '',
  basicAnnual: Deno.env.get('STRIPE_BASIC_ANNUAL_PRICE_ID') || '',
  proMonthly: Deno.env.get('STRIPE_PRO_PRICE_ID') || '',
  proAnnual: Deno.env.get('STRIPE_PRO_ANNUAL_PRICE_ID') || '',
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const STRIPE_HEADERS = { Authorization: `Bearer ${STRIPE_SECRET_KEY}` }

type Obj = Record<string, unknown>

async function stripeGet(path: string): Promise<Obj> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, { headers: STRIPE_HEADERS })
  if (!res.ok) throw new Error(`Stripe GET ${path} → ${res.status} ${await res.text()}`)
  return (await res.json()) as Obj
}

async function* listAllSubscriptions(): AsyncGenerator<Obj> {
  let startingAfter: string | null = null
  for (;;) {
    const qs = new URLSearchParams({ status: 'all', limit: '100' })
    if (startingAfter) qs.set('starting_after', startingAfter)
    const page = await stripeGet(`/subscriptions?${qs}`)
    const data = (page.data as Obj[]) ?? []
    for (const sub of data) yield sub
    if (page.has_more !== true || data.length === 0) return
    startingAfter = data[data.length - 1].id as string
  }
}

/**
 * Resolve the Supabase user for a Stripe customer.
 *   1. profiles.stripe_customer_id (set by checkout)
 *   2. subscription metadata.user_id (set by create-checkout / trial flow)
 *   3. customer email → profiles.email (case-insensitive) — covers the
 *      duplicate-customer case the dup-sub guard describes.
 */
const customerEmailCache = new Map<string, string | null>()

async function resolveUserId(sub: Obj): Promise<string | null> {
  const customerId = idOf(sub.customer)
  if (customerId) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .limit(1)
      .maybeSingle()
    if (data?.id) return data.id as string
  }

  const meta = sub.metadata as Obj | null
  if (typeof meta?.user_id === 'string' && meta.user_id) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', meta.user_id)
      .maybeSingle()
    if (data?.id) return data.id as string
  }

  if (customerId) {
    let email = customerEmailCache.get(customerId)
    if (email === undefined) {
      try {
        const c = await stripeGet(`/customers/${customerId}`)
        email = typeof c.email === 'string' ? c.email : null
      } catch (e) {
        console.warn(`billing-sync: customer fetch failed for ${customerId}`, e)
        email = null
      }
      customerEmailCache.set(customerId, email)
    }
    if (email) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .limit(1)
        .maybeSingle()
      if (data?.id) return data.id as string
    }
  }
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const token = req.headers.get('x-billing-sync-token') ?? ''
  const { data: ok, error: verifyErr } = await supabase.rpc('verify_billing_sync_token', {
    p_token: token,
  })
  if (verifyErr || ok !== true) {
    console.warn('billing-sync: rejected call (bad token)', verifyErr?.message)
    return new Response('Unauthorized', { status: 401 })
  }

  const started = Date.now()
  const summary = { seen: 0, upserted: 0, unresolved_user: 0, errors: 0 }
  const byStatus: Record<string, number> = {}
  const now = new Date()

  try {
    for await (const sub of listAllSubscriptions()) {
      summary.seen++
      try {
        const userId = await resolveUserId(sub)
        if (!userId) summary.unresolved_user++
        const row = mapStripeSubscription(sub, PRICES, userId, now)
        byStatus[row.status] = (byStatus[row.status] ?? 0) + 1

        const { error } = await supabase
          .from('subscriptions')
          .upsert(row, { onConflict: 'id' })
        if (error) {
          summary.errors++
          console.error(`billing-sync: upsert failed for ${row.id}`, error)
        } else {
          summary.upserted++
        }
      } catch (e) {
        summary.errors++
        console.error(`billing-sync: failed on ${sub.id}`, e)
      }
    }
  } catch (e) {
    console.error('billing-sync: list failed', e)
    return new Response(JSON.stringify({ error: String(e), ...summary }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = { ...summary, by_status: byStatus, duration_ms: Date.now() - started }
  console.log('billing-sync:', JSON.stringify(body))

  // Heartbeat so the agent_runs table shows this ran (same place the
  // pipeline watchdogs look).
  await supabase.from('agent_runs').insert({
    agent: 'billing-sync',
    run_at: now.toISOString(),
    duration_ms: body.duration_ms,
    items: summary.upserted,
    errors: summary.errors,
    summary: body,
  })

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  })
})
