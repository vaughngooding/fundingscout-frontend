-- Billing: real subscription records + lifecycle events + alerts.
--
-- Background (2026-11-12): profiles.plan was the ONLY billing state we kept —
-- one word per user, written by the Stripe webhook. It can't say whether a
-- "basic" user is on a $2.99 trial, $19.99/mo, or $99/yr, whether their card
-- is failing, or whether they cancelled last week. Worse, the Stripe endpoint
-- was only subscribed to checkout.session.completed, so the cancel / past-due
-- handlers in stripe-webhook never ran and churned users stayed "basic"/"pro"
-- forever.
--
-- This migration adds:
--   subscriptions    one row per Stripe subscription (status, interval, amount,
--                    trial + period dates, cancellation details, last failure)
--   billing_events   append-only lifecycle log (new / trial_converted /
--                    payment_failed / cancel_scheduled / canceled / …)
--   triggers         subscriptions → billing_events on real transitions;
--                    billing_events → Slack (vault: slack_watchdog_webhook);
--                    subscriptions → profiles.plan reconciliation
--   cron             hourly call to the billing-sync edge function so the DB
--                    converges on Stripe truth even if a webhook is dropped
--   view             customer_billing_overview — "who is paying for what"
--
-- Applied to prod 2026-11-12 via MCP.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.subscriptions (
  id                      text primary key,            -- Stripe sub_…
  user_id                 uuid references public.profiles(id) on delete set null,
  stripe_customer_id      text not null,
  status                  text not null,               -- Stripe status verbatim
  plan                    text not null check (plan in ('basic', 'pro')),
  billing_interval        text check (billing_interval in ('month', 'year')),
  price_id                text,
  amount_cents            integer,
  currency                text,
  is_trial_origin         boolean not null default false,
  trial_start             timestamptz,
  trial_end               timestamptz,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  cancel_at               timestamptz,
  canceled_at             timestamptz,
  ended_at                timestamptz,
  cancellation_reason     text,                        -- Stripe cancellation_details.reason
  cancellation_feedback   text,                        -- …feedback (too_expensive, unused, …)
  cancellation_comment    text,
  last_payment_failed_at  timestamptz,
  last_payment_error      text,
  stripe_created_at       timestamptz,
  synced_at               timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.subscriptions is
  'One row per Stripe subscription. Written by stripe-webhook (real-time) and billing-sync (hourly reconcile). Source of truth for "is this user paying and for what".';

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

create table if not exists public.billing_events (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  user_id            uuid references public.profiles(id) on delete set null,
  subscription_id    text references public.subscriptions(id) on delete set null,
  stripe_customer_id text,
  event_type         text not null check (event_type in (
                       'new_subscription', 'trial_started', 'trial_converted',
                       'payment_succeeded', 'payment_failed',
                       'cancel_scheduled', 'cancel_unscheduled', 'canceled',
                       'upgraded', 'downgraded', 'reactivated', 'status_changed'
                     )),
  plan               text,
  billing_interval   text,
  amount_cents       integer,
  currency           text,
  detail             text,                             -- human-readable: decline reason, feedback, …
  dedupe_key         text unique,                      -- e.g. inv:in_…  — makes webhook retries idempotent
  notify             boolean not null default true,    -- false = historical backfill, don't alert
  notified_at        timestamptz
);

comment on table public.billing_events is
  'Append-only billing lifecycle log. Rows with notify=true are posted to Slack by billing_events_notify().';

create index if not exists billing_events_user_idx on public.billing_events (user_id, created_at desc);
create index if not exists billing_events_type_idx on public.billing_events (event_type, created_at desc);

-- RLS: users may read their own rows (future billing page). Service role
-- bypasses RLS, which is what the webhook and sync use.
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "subscriptions_read_own" on public.subscriptions;
create policy "subscriptions_read_own" on public.subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "billing_events_read_own" on public.billing_events;
create policy "billing_events_read_own" on public.billing_events
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- profiles.plan reconciliation
-- ---------------------------------------------------------------------------
-- Entitlement rule (matches stripe-webhook/plan-resolver.ts): a user is
-- entitled while they hold an active OR trialing subscription. Anything else
-- (past_due, unpaid, canceled, incomplete, …) → 'free'. 'wholesale' is set by
-- hand and never touched. legacy_free is never touched.
--
-- NOTE: past_due → 'free' means a declined card locks the user out on the
-- first failure, before Stripe's dunning retries finish. That is the policy
-- the webhook already encoded (it just never ran — see header). If you'd
-- rather keep access during dunning, add 'past_due' to the IN list below AND
-- in planFromSubscriptionStatus(); keep the two in sync.

create or replace function public.reconcile_profile_plan(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  if p_user_id is null then return; end if;

  select s.plan into v_plan
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
  order by case s.plan when 'pro' then 0 else 1 end,
           s.current_period_end desc nulls last
  limit 1;

  if v_plan is not null then
    update public.profiles
       set plan = v_plan, updated_at = now()
     where id = p_user_id
       and plan is distinct from v_plan
       and plan <> 'wholesale';
  else
    update public.profiles
       set plan = 'free', updated_at = now()
     where id = p_user_id
       and plan in ('basic', 'pro');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- subscriptions → billing_events (transition detection)
-- ---------------------------------------------------------------------------

create or replace function public.subscriptions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before insert or update on public.subscriptions
  for each row execute function public.subscriptions_touch_updated_at();

-- AFTER trigger: billing_events.subscription_id is an FK, so the
-- subscriptions row must already exist when we insert the event.
create or replace function public.subscriptions_emit_billing_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notify   boolean;
  v_type     text;
  v_detail   text;
  v_entitled_old boolean;
  v_entitled_new boolean;
begin
  if tg_op = 'INSERT' then
    -- A subscription first seen more than an hour after Stripe created it is
    -- a backfill, not news. Record it, don't page anyone.
    v_notify := coalesce(new.stripe_created_at, new.created_at) > now() - interval '1 hour';

    if new.status in ('active', 'trialing') then
      v_type := case when new.status = 'trialing' then 'trial_started' else 'new_subscription' end;
      v_detail := case when new.status = 'trialing' and new.trial_end is not null
                       then 'converts ' || to_char(new.trial_end, 'YYYY-MM-DD') end;
      insert into public.billing_events
        (user_id, subscription_id, stripe_customer_id, event_type, plan, billing_interval,
         amount_cents, currency, detail, notify)
      values
        (new.user_id, new.id, new.stripe_customer_id, v_type, new.plan, new.billing_interval,
         new.amount_cents, new.currency, v_detail, v_notify);
    end if;

    perform public.reconcile_profile_plan(new.user_id);
    return new;
  end if;

  -- UPDATE ------------------------------------------------------------------
  v_entitled_old := old.status in ('active', 'trialing');
  v_entitled_new := new.status in ('active', 'trialing');

  -- 1. Status transitions
  if new.status is distinct from old.status then
    v_type := null;
    v_detail := null;

    if old.status = 'trialing' and new.status = 'active' then
      v_type := 'trial_converted';
    elsif new.status in ('past_due', 'unpaid') and old.status in ('active', 'trialing') then
      v_type := 'payment_failed';
      v_detail := coalesce(new.last_payment_error, 'card declined (reason not reported)');
    elsif new.status in ('canceled', 'incomplete_expired') then
      v_type := 'canceled';
      v_detail := concat_ws(' · ',
                    nullif(new.cancellation_reason, ''),
                    nullif(new.cancellation_feedback, ''),
                    nullif(new.cancellation_comment, ''));
    elsif not v_entitled_old and v_entitled_new then
      v_type := 'reactivated';
    else
      v_type := 'status_changed';
      v_detail := old.status || ' → ' || new.status;
    end if;

    insert into public.billing_events
      (user_id, subscription_id, stripe_customer_id, event_type, plan, billing_interval,
       amount_cents, currency, detail)
    values
      (new.user_id, new.id, new.stripe_customer_id, v_type, new.plan, new.billing_interval,
       new.amount_cents, new.currency, nullif(v_detail, ''));
  end if;

  -- 2. Cancellation scheduled / unscheduled (status stays active until period end)
  if new.cancel_at_period_end and not old.cancel_at_period_end then
    insert into public.billing_events
      (user_id, subscription_id, stripe_customer_id, event_type, plan, billing_interval,
       amount_cents, currency, detail)
    values
      (new.user_id, new.id, new.stripe_customer_id, 'cancel_scheduled', new.plan, new.billing_interval,
       new.amount_cents, new.currency,
       concat_ws(' · ',
         'access ends ' || to_char(coalesce(new.cancel_at, new.current_period_end), 'YYYY-MM-DD'),
         nullif(new.cancellation_feedback, ''),
         nullif(new.cancellation_comment, '')));
  elsif old.cancel_at_period_end and not new.cancel_at_period_end and new.status in ('active','trialing') then
    insert into public.billing_events
      (user_id, subscription_id, stripe_customer_id, event_type, plan, billing_interval, amount_cents, currency)
    values
      (new.user_id, new.id, new.stripe_customer_id, 'cancel_unscheduled', new.plan, new.billing_interval,
       new.amount_cents, new.currency);
  end if;

  -- 3. Plan change on a live subscription
  if new.plan is distinct from old.plan and v_entitled_new then
    insert into public.billing_events
      (user_id, subscription_id, stripe_customer_id, event_type, plan, billing_interval,
       amount_cents, currency, detail)
    values
      (new.user_id, new.id, new.stripe_customer_id,
       case when new.plan = 'pro' then 'upgraded' else 'downgraded' end,
       new.plan, new.billing_interval, new.amount_cents, new.currency,
       old.plan || ' → ' || new.plan);
  end if;

  perform public.reconcile_profile_plan(new.user_id);
  if old.user_id is distinct from new.user_id then
    perform public.reconcile_profile_plan(old.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_emit_billing_events on public.subscriptions;
create trigger subscriptions_emit_billing_events
  after insert or update on public.subscriptions
  for each row execute function public.subscriptions_emit_billing_events();

-- ---------------------------------------------------------------------------
-- billing_events → Slack
-- ---------------------------------------------------------------------------
-- Uses slack_watchdog_webhook from vault (same channel as the pipeline
-- watchdog). To route billing to its own channel, add a vault secret named
-- slack_billing_webhook — it takes precedence when present.

create or replace function public.billing_events_notify()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  webhook_url text;
  v_name      text;
  v_email     text;
  v_who       text;
  v_price     text;
  v_headline  text;
  v_emoji     text;
begin
  if not new.notify then return new; end if;
  -- Successful renewals are the expected steady state; don't page on them.
  if new.event_type = 'payment_succeeded' then return new; end if;

  select decrypted_secret into webhook_url
  from vault.decrypted_secrets where name = 'slack_billing_webhook' limit 1;
  if webhook_url is null then
    select decrypted_secret into webhook_url
    from vault.decrypted_secrets where name = 'slack_watchdog_webhook' limit 1;
  end if;
  if webhook_url is null then return new; end if;

  select p.full_name, p.email into v_name, v_email
  from public.profiles p where p.id = new.user_id;
  v_who := coalesce(nullif(v_name, ''), 'Unknown user')
           || coalesce(' (' || v_email || ')', coalesce(' [' || new.stripe_customer_id || ']', ''));

  v_price := coalesce(initcap(new.plan), '?')
             || coalesce(' ' || case new.billing_interval when 'year' then 'annual' when 'month' then 'monthly' end, '')
             || coalesce(' $' || to_char(new.amount_cents / 100.0, 'FM9990.00'), '');

  v_emoji := case new.event_type
    when 'payment_failed'     then '💳🚨'
    when 'canceled'           then '❌'
    when 'cancel_scheduled'   then '🚪'
    when 'cancel_unscheduled' then '↩️'
    when 'new_subscription'   then '🎉'
    when 'trial_started'      then '🧪'
    when 'trial_converted'    then '✅'
    when 'upgraded'           then '⬆️'
    when 'downgraded'         then '⬇️'
    when 'reactivated'        then '🔁'
    else '•' end;

  v_headline := case new.event_type
    when 'payment_failed'     then 'Payment failed'
    when 'canceled'           then 'Subscription canceled'
    when 'cancel_scheduled'   then 'Cancellation scheduled'
    when 'cancel_unscheduled' then 'Cancellation reversed'
    when 'new_subscription'   then 'New subscription'
    when 'trial_started'      then 'Trial started ($2.99)'
    when 'trial_converted'    then 'Trial converted to paid'
    when 'upgraded'           then 'Upgraded'
    when 'downgraded'         then 'Downgraded'
    when 'reactivated'        then 'Reactivated'
    else replace(new.event_type, '_', ' ') end;

  perform net.http_post(
    url := webhook_url,
    body := jsonb_build_object('text',
      format('%s *%s* — %s · %s%s',
        v_emoji, v_headline, v_who, v_price,
        coalesce(' · ' || new.detail, ''))),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  new.notified_at := now();
  return new;
end;
$$;

drop trigger if exists billing_events_notify on public.billing_events;
create trigger billing_events_notify
  before insert on public.billing_events
  for each row execute function public.billing_events_notify();

-- ---------------------------------------------------------------------------
-- Hourly reconcile: DB converges on Stripe even if a webhook is dropped.
-- ---------------------------------------------------------------------------
-- Calls the billing-sync edge function with the shared token from vault
-- (billing_sync_token). The token is generated here once; the edge function
-- verifies it through verify_billing_sync_token() (service_role only), so the
-- secret never leaves Postgres and nobody has to paste it anywhere.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'billing_sync_token') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'billing_sync_token',
      'Shared secret: pg_cron call_billing_sync() -> billing-sync edge function');
  end if;
end $$;

create or replace function public.verify_billing_sync_token(p_token text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'billing_sync_token' and decrypted_secret = p_token
  );
$$;

revoke execute on function public.verify_billing_sync_token(text) from public, anon, authenticated;
grant  execute on function public.verify_billing_sync_token(text) to service_role;

create or replace function public.call_billing_sync()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets where name = 'billing_sync_token' limit 1;
  if v_token is null then
    raise warning 'billing sync: no billing_sync_token in vault';
    return;
  end if;

  perform net.http_post(
    url := 'https://enbinbvpvsbmjdcbcigc.supabase.co/functions/v1/billing-sync',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Billing-Sync-Token', v_token),
    timeout_milliseconds := 60000
  );
end;
$$;

select cron.unschedule('billing-sync')
 where exists (select 1 from cron.job where jobname = 'billing-sync');
select cron.schedule('billing-sync', '17 * * * *', $$select public.call_billing_sync()$$);

-- ---------------------------------------------------------------------------
-- "Who is paying, for what" — one query.
-- ---------------------------------------------------------------------------

create or replace view public.customer_billing_overview
with (security_invoker = true) as
with latest as (
  select distinct on (s.user_id)
         s.*
  from public.subscriptions s
  where s.user_id is not null
  order by s.user_id,
           case when s.status in ('active','trialing') then 0 else 1 end,
           s.current_period_end desc nulls last,
           s.stripe_created_at desc nulls last
)
select
  p.id                       as user_id,
  p.email,
  p.full_name,
  p.plan                     as profile_plan,
  p.legacy_free,
  l.id                       as subscription_id,
  l.status,
  l.plan                     as sub_plan,
  l.billing_interval,
  round(l.amount_cents / 100.0, 2) as amount,
  l.currency,
  l.is_trial_origin,
  l.trial_end,
  l.current_period_end       as renews_or_ends_at,
  l.cancel_at_period_end,
  l.canceled_at,
  l.last_payment_failed_at,
  l.last_payment_error,
  case
    when l.id is null then 'no subscription on record'
    when l.status = 'trialing' then 'TRIAL — converts ' || to_char(l.trial_end, 'Mon DD')
    when l.status = 'active' and l.cancel_at_period_end then 'PAYING — cancels ' || to_char(coalesce(l.cancel_at, l.current_period_end), 'Mon DD')
    when l.status = 'active' then 'PAYING'
    when l.status = 'past_due' then 'PAYMENT FAILING'
    when l.status in ('canceled','unpaid','incomplete_expired') then 'CHURNED'
    else upper(l.status)
  end as billing_state
from public.profiles p
left join latest l on l.user_id = p.id;

comment on view public.customer_billing_overview is
  'One row per user with their most relevant Stripe subscription. billing_state is the human answer to "are they paying?".';
