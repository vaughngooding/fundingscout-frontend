/**
 * Two-step trial flow part 2: turn a completed mode=payment Checkout Session
 * (where the user just paid $2.99) into a Basic Monthly subscription with a
 * 7-day trial.
 *
 * Pure module — no Deno globals — so it can be unit-tested in vitest like
 * plan-resolver.ts. The caller injects fetch + secrets + price IDs.
 *
 * Lifecycle:
 *   - User pays $2.99 via Checkout (route.ts trial branch).
 *   - checkout.session.completed fires.
 *   - Webhook handler invokes this function.
 *   - We pull the saved card off the PaymentIntent, attach it to the customer
 *     as default, then create the Subscription with trial_period_days=7.
 *   - Stripe fires customer.subscription.created → existing handler updates
 *     the profile.
 *   - Day 4: customer.subscription.trial_will_end → existing reminder email.
 *   - Day 8: Stripe charges $19.99, subscription transitions trialing→active.
 */

export interface TrialSubscriptionDeps {
  stripeSecretKey: string
  basicMonthlyPriceId: string
  // Injected for testability. In production this is just the global fetch.
  fetchFn?: typeof fetch
}

export interface TrialSessionInput {
  id: string
  customer: string | null
  payment_intent: string | null
  metadata: Record<string, string> | null
}

async function stripeApi(
  deps: TrialSubscriptionDeps,
  path: string,
  method: 'GET' | 'POST',
  body?: URLSearchParams,
  idempotencyKey?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${deps.stripeSecretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  const fn = deps.fetchFn ?? fetch
  return fn(`https://api.stripe.com/v1${path}`, {
    method,
    headers,
    body: body?.toString(),
  })
}

/**
 * Creates the trial subscription from a completed Checkout Session. Throws on
 * any Stripe error so the outer webhook handler returns non-2xx and Stripe
 * retries the event. Idempotency-Key on the subscription create makes retries
 * safe — Stripe returns the same subscription on duplicate keys.
 *
 * Returns the created subscription ID.
 */
export async function createTrialSubscriptionFromPayment(
  deps: TrialSubscriptionDeps,
  session: TrialSessionInput,
): Promise<string> {
  const { id: sessionId, customer: customerId, payment_intent: paymentIntentId, metadata } = session
  const userId = metadata?.user_id ?? null

  if (!customerId) {
    throw new Error(`trial: session ${sessionId} has no customer; cannot create subscription`)
  }
  if (!paymentIntentId) {
    throw new Error(`trial: session ${sessionId} has no payment_intent; cannot find saved card`)
  }
  if (!deps.basicMonthlyPriceId) {
    throw new Error('trial: STRIPE_BASIC_MONTHLY_PRICE_ID not configured')
  }

  // Step 1: pull the saved payment method off the PaymentIntent.
  const piRes = await stripeApi(deps, `/payment_intents/${paymentIntentId}`, 'GET')
  if (!piRes.ok) {
    throw new Error(
      `trial: failed to fetch payment_intent ${paymentIntentId}: ${piRes.status} ${await piRes.text()}`,
    )
  }
  const pi = (await piRes.json()) as { payment_method?: string | null }
  const paymentMethodId = pi.payment_method ?? null
  if (!paymentMethodId) {
    throw new Error(`trial: payment_intent ${paymentIntentId} has no payment_method`)
  }

  // Step 2: set the saved card as the customer's default — so any future
  // invoice retry (e.g. day 8 charge fails, dunning kicks in) charges the
  // right card.
  const customerUpdateBody = new URLSearchParams()
  customerUpdateBody.append('invoice_settings[default_payment_method]', paymentMethodId)
  const customerUpdateRes = await stripeApi(deps, `/customers/${customerId}`, 'POST', customerUpdateBody)
  if (!customerUpdateRes.ok) {
    throw new Error(
      `trial: failed to set default PM on ${customerId}: ${customerUpdateRes.status} ${await customerUpdateRes.text()}`,
    )
  }

  // Step 3: create the subscription. Idempotency key derived from session.id
  // makes webhook retries safe.
  const subBody = new URLSearchParams()
  subBody.append('customer', customerId)
  subBody.append('items[0][price]', deps.basicMonthlyPriceId)
  subBody.append('trial_period_days', '7')
  subBody.append('default_payment_method', paymentMethodId)
  // Required so Stripe charges the saved card on day 8 even if it was deleted
  // from the customer in the meantime — matches our "convert to paid" intent.
  subBody.append('trial_settings[end_behavior][missing_payment_method]', 'create_invoice')
  if (userId) subBody.append('metadata[user_id]', userId)
  subBody.append('metadata[intended_plan]', 'basic')
  subBody.append('metadata[checkout_plan]', 'trial')

  const subRes = await stripeApi(deps, '/subscriptions', 'POST', subBody, `trial-sub-${sessionId}`)
  if (!subRes.ok) {
    throw new Error(
      `trial: failed to create subscription for ${customerId}: ${subRes.status} ${await subRes.text()}`,
    )
  }
  const sub = (await subRes.json()) as { id: string }
  return sub.id
}
