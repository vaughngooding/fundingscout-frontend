-- Track email opens via Resend webhook (email.opened event).
-- The /api/resend-webhook endpoint updates these columns on each open.
-- We track per-profile (one row per user) rather than per-email; for the
-- digest format, "did the user open at least one email this week?" is
-- the engagement signal we care about.

alter table public.profiles
  add column if not exists last_email_opened_at timestamptz,
  add column if not exists email_opens_total integer not null default 0;

create index if not exists profiles_last_email_opened_at_idx
  on public.profiles (last_email_opened_at desc nulls last);
