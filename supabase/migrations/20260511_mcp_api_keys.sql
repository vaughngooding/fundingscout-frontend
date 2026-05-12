-- ============================================================================
-- Hosted MCP / REST API foundation.
--
-- What this migration does:
--   1. Locks down funding_rounds RLS from public-anon-SELECT to authenticated-
--      only. The MCP/REST routes use the service-role client AFTER API-key
--      auth has passed, so they're unaffected. The legacy `FundingPreview`
--      component (the only place that relied on anon SELECT) is unused.
--
--   2. Creates fs_api_keys for hashed-key auth (sha256 of fs_live_... tokens).
--      RLS lets the owner manage their own keys via Supabase Auth cookies in
--      the Settings UI; the MCP runtime reads keys via service-role lookup.
--
--   3. Creates fs_api_usage as the per-key per-day per-tool counter. Atomic
--      UPSERT pattern from the API middleware. Service-role only (no app
--      writes from cookie sessions).
--
--   4. Creates fs_contact_reveals — audit log row for every reveal_contact
--      call. Compliance + abuse detection. Service-role only.
--
--   5. Adds funding_rounds filter indexes the MCP needs (funding_type,
--      location_country, industry_tags GIN, plus the (published_date, id)
--      composite for cursor pagination).
--
-- Reversibility:
--   - The new tables are additive and safe to drop if rolled back.
--   - The RLS change is reversed by re-creating the old "Allow anonymous
--     read on funding_rounds" policy. The data is unchanged either way.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS lockdown on funding_rounds
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow anonymous read on funding_rounds" ON public.funding_rounds;
DROP POLICY IF EXISTS "Authenticated read on funding_rounds" ON public.funding_rounds;

CREATE POLICY "Authenticated read on funding_rounds"
  ON public.funding_rounds
  FOR SELECT
  TO authenticated
  USING (true);

-- service_role bypasses RLS by design — the MCP route uses it after the
-- fs_api_keys hash lookup confirms the request is from a paying Pro user.

-- ---------------------------------------------------------------------------
-- 2. API keys table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fs_api_keys (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT         NOT NULL,
  prefix        TEXT         NOT NULL,          -- first 12 chars, e.g. "fs_live_a1b2", shown in UI
  key_hash      TEXT         NOT NULL UNIQUE,   -- sha256(full_key) hex
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fs_api_keys_user ON public.fs_api_keys(user_id);
-- Partial index — only active (non-revoked) keys are looked up at request time.
CREATE INDEX IF NOT EXISTS idx_fs_api_keys_hash_active
  ON public.fs_api_keys(key_hash) WHERE revoked_at IS NULL;

COMMENT ON TABLE public.fs_api_keys IS
  'API keys for the hosted MCP / REST endpoints. Pro-only. Full token is '
  'shown once at creation; only the sha256 hash is stored. Revoke by setting '
  'revoked_at; never DELETE (audit log references it).';

ALTER TABLE public.fs_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own keys"    ON public.fs_api_keys;
DROP POLICY IF EXISTS "owner creates own keys"  ON public.fs_api_keys;
DROP POLICY IF EXISTS "owner revokes own keys"  ON public.fs_api_keys;

CREATE POLICY "owner reads own keys"
  ON public.fs_api_keys FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "owner creates own keys"
  ON public.fs_api_keys FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner revokes own keys"
  ON public.fs_api_keys FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- No DELETE policy: keys are revoked (revoked_at IS NOT NULL), never removed,
-- so the audit table's foreign key remains valid forever.

-- ---------------------------------------------------------------------------
-- 3. Per-key per-day per-tool usage counter
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fs_api_usage (
  key_id  UUID    NOT NULL REFERENCES public.fs_api_keys(id) ON DELETE CASCADE,
  day     DATE    NOT NULL,
  tool    TEXT    NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, day, tool)
);

COMMENT ON TABLE public.fs_api_usage IS
  'Atomic counter table for daily quotas. App writes via:  '
  '  INSERT ... (key_id, day, tool, count) VALUES (...,1)  '
  '  ON CONFLICT (key_id, day, tool) DO UPDATE SET count = fs_api_usage.count + 1  '
  '  WHERE fs_api_usage.count < <limit>  RETURNING count.  '
  'No app-layer RLS reads — service-role only.';

ALTER TABLE public.fs_api_usage ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE policies for non-service-role; the service-role
-- bypasses RLS anyway. This makes anon/authenticated reads return zero rows.

-- ---------------------------------------------------------------------------
-- 4. CEO contact reveal audit log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fs_contact_reveals (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id            UUID         NOT NULL REFERENCES public.fs_api_keys(id) ON DELETE CASCADE,
  user_id           UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funding_round_id  UUID         NOT NULL REFERENCES public.funding_rounds(id) ON DELETE CASCADE,
  revealed_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_reveals_user_day
  ON public.fs_contact_reveals(user_id, revealed_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_key_day
  ON public.fs_contact_reveals(key_id, revealed_at DESC);

COMMENT ON TABLE public.fs_contact_reveals IS
  'One row per successful reveal_contact MCP call. Used for abuse detection '
  '(unusual volume per key/day) and compliance evidence.';

ALTER TABLE public.fs_contact_reveals ENABLE ROW LEVEL SECURITY;
-- Service-role only. (Admin dashboard reads via service-role.)

-- ---------------------------------------------------------------------------
-- 5. funding_rounds indexes for MCP filtering
-- ---------------------------------------------------------------------------

-- Cursor-pagination composite. The MCP encodes (published_date, id) as the
-- opaque cursor; this index makes the WHERE row > cursor query fast.
CREATE INDEX IF NOT EXISTS idx_funding_rounds_published_id
  ON public.funding_rounds(published_date DESC NULLS LAST, id DESC);

CREATE INDEX IF NOT EXISTS idx_funding_rounds_funding_type
  ON public.funding_rounds(funding_type);

CREATE INDEX IF NOT EXISTS idx_funding_rounds_location_country
  ON public.funding_rounds(location_country);

CREATE INDEX IF NOT EXISTS idx_funding_rounds_industry_tags
  ON public.funding_rounds USING gin(industry_tags);

-- ---------------------------------------------------------------------------
-- 6. Verify the lockdown matched expectations (sanity output for migration logs)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  active_policies INT;
BEGIN
  SELECT COUNT(*) INTO active_policies
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'funding_rounds';
  RAISE NOTICE 'funding_rounds active policies: %', active_policies;
END $$;
