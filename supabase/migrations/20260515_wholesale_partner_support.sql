-- ============================================================================
-- Wholesale partner support — Alphaflow & future resellers.
--
-- Three concerns in one migration:
--   1. HMAC webhook signing: add a per-key webhook_secret so partners can
--      verify "did this webhook really come from FundingScout, untampered?"
--   2. Per-key quota overrides: bump daily limits for high-volume partners
--      without changing the global defaults.
--   3. 'wholesale' plan tier: a new value on profiles.plan so we can route
--      pricing + access-control for reseller customers without forking the
--      existing pro flow.
--
-- Reversibility: all additive; safe to drop columns / revert CHECK constraint
-- to roll back.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Webhook secret for HMAC signing
-- ---------------------------------------------------------------------------
--
-- Format: "fs_whsec_" + 32 random base64url chars. Stored as plaintext for v1
-- (revealing it only allows a third party to FORGE webhooks pointed at the
-- customer's endpoint — not access the API). Encryption-at-rest via Supabase
-- Vault can be added later without changing the column.

ALTER TABLE public.fs_api_keys
  ADD COLUMN IF NOT EXISTS webhook_secret        TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret_prefix TEXT;  -- first 16 chars for display in UI

COMMENT ON COLUMN public.fs_api_keys.webhook_secret IS
  'Plaintext fs_whsec_... secret used to compute HMAC-SHA256 on outbound '
  'webhook bodies. Sent to the customer once at key creation; the customer '
  'verifies via the X-FundingScout-Signature header.';

-- ---------------------------------------------------------------------------
-- 2. Per-key daily quota overrides
-- ---------------------------------------------------------------------------
--
-- JSONB map of tool_name -> custom daily limit. Empty {} = use DEFAULT_QUOTAS
-- from src/lib/api/quota.ts. Wholesale partners get bumped here manually.
-- Example: {"crm_accounts_upsert": 50000, "mcp_request": 10000}

ALTER TABLE public.fs_api_keys
  ADD COLUMN IF NOT EXISTS daily_quota_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.fs_api_keys.daily_quota_overrides IS
  'Per-tool daily quota overrides for this key. Empty object means use the '
  'global DEFAULT_QUOTAS. Operator-only; modify via Supabase Studio for now.';

-- ---------------------------------------------------------------------------
-- 3. Wholesale plan tier
-- ---------------------------------------------------------------------------
--
-- profiles.plan already had CHECK ('free', 'basic', 'pro') from the
-- 20260501 migration. Extend it to allow 'wholesale'. Resellers like
-- Alphaflow pay a platform fee that doesn't fit the per-seat pro tier.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'basic', 'pro', 'wholesale'));

COMMENT ON COLUMN public.profiles.plan IS
  'free | basic | pro | wholesale. ''wholesale'' is for reseller partners '
  '(e.g. Alphaflow) — billed manually via invoice, not Stripe Checkout. '
  'Grant via direct UPDATE in Supabase Studio.';

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE 'fs_api_keys new columns: webhook_secret, webhook_secret_prefix, daily_quota_overrides';
  RAISE NOTICE 'profiles.plan now allows: free, basic, pro, wholesale';
END $$;
