-- ============================================================================
-- Eliminate the free signup path; introduce Basic tier and grandfather flag.
--
-- Why:
--   Starting 2026-04-29, FundingScout no longer offers a free tier to NEW
--   signups. New users must subscribe (Trial $2.99/7d → Basic $19.99/mo, or
--   direct to Basic / Pro). Existing free users are grandfathered indefinitely
--   onto their current free experience (digest, dashboard, filters).
--
-- Pro tier is UNCHANGED by this migration — Pro pricing, features, and the
-- existing `plan='pro'` semantics are untouched.
--
-- What this migration does:
--   1. Adds `legacy_free` boolean to `profiles` so we can distinguish
--      grandfathered free users from "lapsed paid" users (cancelled new
--      signups who land on plan='free' but have never been entitled).
--   2. Backfills `legacy_free=true` for every current free user.
--   3. Indexes the column for the access-check read path.
--
-- The `plan` column itself is NOT changed in this migration. New tier values
-- (`'basic'`) are written by application code. If you need to add a CHECK
-- constraint enumerating allowed plan values, do it in a follow-up migration
-- after the basic tier has been live and verified.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legacy_free BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles
SET legacy_free = TRUE
WHERE plan = 'free';

CREATE INDEX IF NOT EXISTS idx_profiles_legacy_free
  ON public.profiles(legacy_free) WHERE legacy_free = TRUE;

COMMENT ON COLUMN public.profiles.legacy_free IS
  'True for users created before the 2026-04-29 free-tier elimination. '
  'Grandfathers them onto the current free feature set indefinitely. '
  'New signups default to FALSE; if they cancel a Stripe subscription and '
  'land back on plan=free, they remain legacy_free=false and are paywalled.';
