-- ============================================================================
-- Cloud pipeline watchdog — off-box heartbeat monitor.
--
-- Why: the Mac Mini pipeline died silently twice in two weeks (Jul 1,
-- Jul 12 — full days of missed rounds). The existing watchdog runs ON the
-- Mac Mini, so when the machine dies the watchdog dies with it. This
-- watchdog runs inside Supabase (pg_cron), fully independent of the Mini.
--
-- Behavior:
--   * Every 5 minutes, check max(run_at) of agent_runs where agent='scraper'
--     (the pipeline writes a row every minute when healthy).
--   * If stale > 10 minutes: POST an alert to the Slack #watchdog webhook
--     (URL stored in Supabase Vault under 'slack_watchdog_webhook').
--   * Anti-spam: first alert immediately, then re-alert hourly while down.
--   * Recovery: when the heartbeat resumes, send an all-clear with outage
--     duration, then reset state.
--
-- Prereq (one-time, NOT in this migration — secret value lives in Vault):
--   select vault.create_secret('<slack webhook url>', 'slack_watchdog_webhook',
--     'Slack #watchdog incoming webhook for cloud pipeline heartbeat alerts');
--
-- Applied to prod 2026-07-14 via MCP apply_migration.
-- Cost: one indexed MAX() every 5 min + rare HTTP POSTs. Effectively zero.
-- ============================================================================

create extension if not exists pg_cron;

-- Single-row state table for alert bookkeeping
create table if not exists public.pipeline_watchdog_state (
  id            int primary key default 1 check (id = 1),
  is_down       boolean not null default false,
  down_since    timestamptz,
  last_alert_at timestamptz
);
insert into public.pipeline_watchdog_state (id) values (1)
on conflict (id) do nothing;

alter table public.pipeline_watchdog_state enable row level security;
-- No policies: service-role / postgres only.

create or replace function public.check_pipeline_heartbeat()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  latest_run    timestamptz;
  stale_minutes numeric;
  webhook_url   text;
  st            public.pipeline_watchdog_state%rowtype;
  msg           text;
begin
  select decrypted_secret into webhook_url
  from vault.decrypted_secrets
  where name = 'slack_watchdog_webhook'
  limit 1;

  if webhook_url is null then
    raise warning 'pipeline watchdog: no slack_watchdog_webhook secret in vault';
    return;
  end if;

  select max(run_at) into latest_run from public.agent_runs where agent = 'scraper';
  stale_minutes := extract(epoch from (now() - coalesce(latest_run, now() - interval '999 hours'))) / 60;

  select * into st from public.pipeline_watchdog_state where id = 1;

  if stale_minutes > 10 then
    -- Pipeline is DOWN. Alert on first detection, then hourly.
    if not st.is_down or st.last_alert_at < now() - interval '60 minutes' then
      msg := format(
        '🚨 *Mac Mini pipeline is DOWN* — no scraper heartbeat for %s minutes (last run: %s UTC). ' ||
        'Check: is the Mac Mini on? `crontab -l`? /tmp/fundingscout.log? ' ||
        '(This alert is from the CLOUD watchdog in Supabase — it works even when the Mini is dead.)',
        round(stale_minutes), to_char(latest_run, 'YYYY-MM-DD HH24:MI')
      );
      perform net.http_post(
        url := webhook_url,
        body := jsonb_build_object('text', msg),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
      update public.pipeline_watchdog_state
      set is_down = true,
          down_since = coalesce(down_since, latest_run),
          last_alert_at = now()
      where id = 1;
    end if;
  else
    -- Pipeline healthy. If we were down, send recovery + reset.
    if st.is_down then
      msg := format(
        '✅ *Mac Mini pipeline RECOVERED* — scraper heartbeat resumed at %s UTC after ~%s minutes of downtime.',
        to_char(latest_run, 'YYYY-MM-DD HH24:MI'),
        round(extract(epoch from (now() - coalesce(st.down_since, now()))) / 60)
      );
      perform net.http_post(
        url := webhook_url,
        body := jsonb_build_object('text', msg),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
      update public.pipeline_watchdog_state
      set is_down = false, down_since = null, last_alert_at = null
      where id = 1;
    end if;
  end if;
end;
$$;

-- Run every 5 minutes. Worst-case detection: ~15 min after death
-- (10-min stale threshold + 5-min check interval).
select cron.schedule(
  'pipeline-heartbeat-check',
  '*/5 * * * *',
  $$select public.check_pipeline_heartbeat()$$
);
