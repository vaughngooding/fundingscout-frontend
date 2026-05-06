-- early_alerts — Form D filings that V5 (rules + Haiku+Exa verifier gate) has
-- flagged as likely-real funding rounds, alongside their classification of
-- the company's most-recent prior funding stage. Backs the customer-facing
-- "Early Alerts" tab on the Pro dashboard and the internal HTML refresh.
--
-- Lifecycle (status column):
--   active     — filed in last 14 days, no press match yet. Customer-visible.
--   confirmed  — promoted when a row in funding_rounds matches by name+date.
--                Stays visible (with lead-time badge) for the bragging-rights
--                "we called it N days early" tab.
--   stale      — aged >14 days from form_d_filing_date with no match. Hidden
--                from customers but kept for the diagnostic loop that drives
--                V6 rule improvements.
--
-- Customer-facing filter applies on TOP of status, gating by stage_category:
--   show by default → no_prior, seed_prior, ambiguous (likely first round /
--                     post-seed / unclear)
--   hide by default → series_a_prior, later_stage (likely raising B+ — wrong
--                     audience for our seed/A pitch)
--
-- The Python pipeline (populate_early_alerts.py) is the only writer. RLS is
-- enabled but no policies are defined — only the service-role key reads and
-- writes. The Next.js route reads via service role server-side (no direct
-- client access).

create table if not exists public.early_alerts (
  id uuid primary key default gen_random_uuid(),

  -- identity (from EDGAR)
  cik text not null,
  accession text not null,
  entity_name text not null,
  normalized_name text not null,

  unique (cik, accession),

  -- Form D payload
  form_d_filing_date date not null,
  form_d_url text not null,
  form_d_xml_url text not null,
  industry text,
  state_of_business text,
  entity_type text,
  amount_usd bigint,

  -- V5 classifier output
  v5_bin text not null check (v5_bin in ('high', 'medium')),
  v5_score integer not null,

  -- Verifier (Haiku + Exa, "is this a real startup round?")
  verifier_is_real boolean,
  verifier_confidence text check (verifier_confidence in ('high', 'medium', 'low') or verifier_confidence is null),
  verifier_evidence text,
  verifier_article_url text,

  -- Best-effort website (derived from verifier article URL when not a news host)
  website_url text,

  -- Stage filter (Phase 1.1 — Haiku+Exa-derived prior funding classification)
  stage_category text not null check (stage_category in (
    'no_prior', 'seed_prior', 'series_a_prior', 'later_stage', 'ambiguous'
  )),
  stage_source text not null check (stage_source in ('haiku', 'db', 'default')),
  prior_stage text,             -- raw stage Haiku reported (seed/series-a/etc)
  prior_amount_usd bigint,
  prior_year integer,
  prior_evidence text,

  -- Lifecycle
  status text not null default 'active' check (status in ('active', 'confirmed', 'stale')),
  confirmed_at timestamptz,
  confirmed_funding_round_id uuid references public.funding_rounds(id) on delete set null,
  lead_time_days integer,       -- form_d_filing_date − funding_rounds.published_date (positive = caught early)
  staled_at timestamptz,
  diagnostic_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Read paths the dashboard cares about: by status (filter active+stage),
-- by date (sort), by name (promotion match against funding_rounds).
create index if not exists early_alerts_status_filing_idx
  on public.early_alerts (status, form_d_filing_date desc);
create index if not exists early_alerts_normalized_name_idx
  on public.early_alerts (normalized_name);
create index if not exists early_alerts_stage_idx
  on public.early_alerts (stage_category) where status = 'active';

-- Auto-bump updated_at on any row mutation so the cache-bust path (Next.js
-- revalidate) has a stable signal.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists early_alerts_set_updated_at on public.early_alerts;
create trigger early_alerts_set_updated_at
  before update on public.early_alerts
  for each row
  execute function public.set_updated_at();

alter table public.early_alerts enable row level security;
-- Intentionally no policies: only the service-role key reads/writes.
