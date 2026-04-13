CREATE OR REPLACE FUNCTION public.match_funding_to_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- L4: SEC EDGAR rounds NEVER fire user_alerts (catch-up enrichment)
  IF NEW.extraction_method = 'sec_edgar' THEN
    RETURN NEW;
  END IF;

  -- Match users + L3 logical-dedup guard via normalize_company_name()
  INSERT INTO user_alerts (user_id, funding_round_id)
  SELECT up.user_id, NEW.id
  FROM user_preferences up
  WHERE
    NEW.amount_usd BETWEEN COALESCE(up.min_amount, 0) AND COALESCE(up.max_amount, 10000000000)
    AND (
      up.funding_types IS NULL
      OR up.funding_types = '{}'
      OR NEW.funding_type = ANY(up.funding_types)
    )
    AND (
      up.countries IS NULL
      OR up.countries = '{}'
      OR NEW.location_country = ANY(up.countries)
    )
    AND (
      up.industries IS NULL
      OR up.industries = '{}'
      OR NEW.industry_tags && up.industries
    )
    -- L3 logical dedup: skip if this user already has an alert for a
    -- normalized-matching company in the last 7 days. Uses our shared
    -- normalize_company_name() function which strips Inc/LLC/Bio/Tech/etc.
    -- so press articles about the same round (with name variations like
    -- "Stipple Bio, Inc." vs "Stipple Bio") don't double-fire.
    AND NOT EXISTS (
      SELECT 1
      FROM user_alerts ua_existing
      JOIN funding_rounds fr_existing ON fr_existing.id = ua_existing.funding_round_id
      WHERE ua_existing.user_id = up.user_id
        AND ua_existing.created_at > NOW() - INTERVAL '7 days'
        AND normalize_company_name(fr_existing.company_name) = normalize_company_name(NEW.company_name)
        AND length(normalize_company_name(NEW.company_name)) >= 3
    )
  ON CONFLICT (user_id, funding_round_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
