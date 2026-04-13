-- ============================================================================
-- Layer 3 + Layer 4: Defense-in-depth fixes for the carpet-bomb incident
-- (2026-04-09)
-- ============================================================================
--
-- The match_funding_to_users() trigger creates user_alerts for every new
-- funding_rounds row. Two bugs caused the incident:
--
--   L4 (sec_edgar): when the EDGAR runner inserted catch-up rounds, the
--       trigger fired user_alerts for all of them, treating week-old SEC
--       filings as real-time discoveries. Fix: skip sec_edgar inserts
--       entirely. EDGAR is enrichment, not discovery.
--
--   L3 (logical dedup): when the same round was scraped from a second
--       press source (e.g. BusinessWire after we already had it from
--       TechCrunch), the duplicate row triggered fresh user_alerts for
--       every user, even though they'd already been notified about the
--       same logical round days earlier. Fix: NOT EXISTS check that
--       refuses to create a user_alert if the same user already has one
--       for a normalized-matching company name within 7 days.
--
-- Both fixes are belt-and-suspenders defenses. The Python pipeline ALSO
-- needs L1+L2 (loose dedup + UPDATE-not-INSERT in run_fast.py) to prevent
-- duplicate funding_rounds rows in the first place.
--
-- Reference: tasks/lessons.md "2026-04-09 carpet-bomb incident"

CREATE OR REPLACE FUNCTION public.match_funding_to_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- L4: SEC EDGAR rounds NEVER fire user_alerts. EDGAR is catch-up
  -- enrichment data (1-15 days lagged from real-time). Users opt in to
  -- real-time alerts; receiving alerts about week-old rounds is noise.
  -- The press scraper handles real-time; EDGAR fills in the gaps for
  -- the dashboard view + verifies amounts on existing rounds.
  IF NEW.extraction_method = 'sec_edgar' THEN
    RETURN NEW;
  END IF;

  -- Insert user_alerts for matching users — but with L3 logical-dedup
  -- guard: skip users who already have a recent alert for a
  -- normalized-matching company name. This prevents duplicate
  -- funding_rounds rows (e.g. Stipple Bio appearing via TechCrunch AND
  -- via BusinessWire) from creating duplicate user_alerts.
  --
  -- Normalization: lowercase, strip everything except alphanumerics.
  -- Stipple Bio == "Stipple Bio, Inc." == "STIPPLE BIO" all collapse
  -- to "stipplebio". Match window is 7 days — no user should get a
  -- second alert for the same round within a week.
  INSERT INTO user_alerts (user_id, funding_round_id)
  SELECT up.user_id, NEW.id
  FROM user_preferences up
  WHERE
    -- Amount range
    NEW.amount_usd BETWEEN COALESCE(up.min_amount, 0) AND COALESCE(up.max_amount, 10000000000)
    -- Funding type filter
    AND (
      up.funding_types IS NULL
      OR up.funding_types = '{}'
      OR NEW.funding_type = ANY(up.funding_types)
    )
    -- Country filter
    AND (
      up.countries IS NULL
      OR up.countries = '{}'
      OR NEW.location_country = ANY(up.countries)
    )
    -- Industry filter
    AND (
      up.industries IS NULL
      OR up.industries = '{}'
      OR NEW.industry_tags && up.industries
    )
    -- L3 logical dedup: this user must NOT already have an alert for
    -- a logically-matching company in the last 7 days
    AND NOT EXISTS (
      SELECT 1
      FROM user_alerts ua_existing
      JOIN funding_rounds fr_existing ON fr_existing.id = ua_existing.funding_round_id
      WHERE ua_existing.user_id = up.user_id
        AND ua_existing.created_at > NOW() - INTERVAL '7 days'
        AND lower(regexp_replace(fr_existing.company_name, '[^a-zA-Z0-9]', '', 'g'))
            = lower(regexp_replace(NEW.company_name, '[^a-zA-Z0-9]', '', 'g'))
    )
  ON CONFLICT (user_id, funding_round_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
