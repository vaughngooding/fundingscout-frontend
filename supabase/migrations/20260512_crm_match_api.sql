-- ============================================================================
-- CRM Match API tables (companion to fs_api_keys from 20260511_mcp_api_keys.sql).
--
-- This migration adds the schema for the customer-CRM-match feature:
--   - crm_accounts:           customer's CRM accounts/companies they've synced to us
--   - crm_contacts:           customer's CRM contacts/people
--   - crm_match_notifications: log + webhook delivery state for each (user, funding_round) match
--   - user_preferences.crm_webhook_url: the customer's push-notification URL
--
-- Auth model: a "client" is a Pro user (auth.users.id). They generate API
-- keys via the existing fs_api_keys flow (see 20260511_mcp_api_keys.sql),
-- and use those keys against /api/v1/{accounts,contacts,webhooks,matches}.
-- Multiple keys for the same user share the same CRM data (rotating a key
-- doesn't lose the synced accounts/contacts).
--
-- Three-way match logic, executed by send-webhooks edge function:
--   path 1: account_domain — crm_accounts.normalized_domain = funding_round website domain
--   path 2: email_domain   — crm_contacts.email_domain = funding_round website domain
--   path 3: account_name   — crm_accounts.normalized_name = normalized(funding_round.company_name)
-- One notification per (user_id, funding_round_id) — unique constraint dedupes.
-- ============================================================================

create extension if not exists pg_trgm;

-- ---------- Customer's CRM accounts (companies) ----------
create table if not exists public.crm_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,                   -- their CRM's account ID
  name text not null,
  normalized_name text,                        -- for fuzzy-name match when domain missing
  domain text,                                 -- e.g., "vellum.ai"
  normalized_domain text,                      -- stripped of www., lowercased, no protocol
  metadata jsonb,                              -- catchall for customer-specific fields
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);
create index if not exists crm_accounts_normalized_domain_idx
  on public.crm_accounts(normalized_domain) where normalized_domain is not null;
create index if not exists crm_accounts_normalized_name_idx
  on public.crm_accounts(normalized_name) where normalized_name is not null;

-- ---------- Customer's CRM contacts (people) ----------
create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,
  email text,
  email_domain text,                           -- extracted + lowercased from email
  first_name text,
  last_name text,
  account_external_id text,                    -- links to crm_accounts.external_id
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);
create index if not exists crm_contacts_email_domain_idx
  on public.crm_contacts(email_domain) where email_domain is not null;
create index if not exists crm_contacts_account_idx
  on public.crm_contacts(user_id, account_external_id) where account_external_id is not null;

-- ---------- Match notifications + webhook delivery log ----------
create table if not exists public.crm_match_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  account_id uuid references public.crm_accounts(id) on delete set null,
  funding_round_id uuid not null references public.funding_rounds(id) on delete cascade,
  match_type text not null check (match_type in ('email_domain','account_domain','account_name')),
  webhook_status text check (webhook_status in ('pending','delivered','failed','no_webhook')),
  webhook_response_code integer,
  webhook_response_body text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, funding_round_id)
);
create index if not exists crm_match_user_created_idx
  on public.crm_match_notifications(user_id, created_at desc);
create index if not exists crm_match_pending_idx
  on public.crm_match_notifications(webhook_status) where webhook_status in ('pending','failed');

-- ---------- updated_at triggers (shared function from earlier migration) ----------
drop trigger if exists crm_accounts_set_updated_at on public.crm_accounts;
create trigger crm_accounts_set_updated_at
  before update on public.crm_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists crm_contacts_set_updated_at on public.crm_contacts;
create trigger crm_contacts_set_updated_at
  before update on public.crm_contacts
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.crm_accounts enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_match_notifications enable row level security;
-- No policies: service-role only. The Next.js API routes call
-- authenticateApiKey() to validate the fs_live_xxx token → user_id, then
-- use the service-role client to scope queries to that user_id.

-- ---------- Webhook URL on user_preferences ----------
alter table public.user_preferences
  add column if not exists crm_webhook_url text;
comment on column public.user_preferences.crm_webhook_url is
  'HTTPS URL where FundingScout POSTs CRM match notifications. Settable via POST /api/v1/webhooks; nullable for pull-only customers.';
