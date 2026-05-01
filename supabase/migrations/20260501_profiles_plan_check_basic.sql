-- Update profiles_plan_check to allow 'basic' alongside 'free' and 'pro'.
--
-- The 2026-04-29 pricing overhaul (commit e002c92) introduced the Basic
-- tier but explicitly deferred the CHECK constraint update — see comment
-- in 20260429_eliminate_free_tier.sql:
--
--     "If you need to add a CHECK constraint enumerating allowed plan
--      values, do it in a follow-up migration after the basic tier has
--      been live and verified."
--
-- That follow-up never landed. As a result, every webhook that tried to
-- write plan='basic' to profiles silently failed with:
--
--     ERROR: 23514 — new row for relation "profiles" violates
--     check constraint "profiles_plan_check"
--
-- Subscriptions on the Stripe side were created correctly, but the
-- Supabase profile stayed paywalled, locking trial users out of the app.
--
-- This migration drops the old constraint and re-creates it with 'basic'
-- in the allowed set.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'basic', 'pro'));
