-- Fix: match_funding_to_users() silently dropped all alerts when a user had
-- empty funding_types. New users were getting zero alerts because the
-- `funding_type = ANY(funding_types)` clause returns false for empty arrays.
--
-- New behavior: empty/null arrays are treated as "match everything" — same
-- semantics already used for countries and industries.

CREATE OR REPLACE FUNCTION match_funding_to_users()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_alerts (user_id, funding_round_id)
  SELECT up.user_id, NEW.id
  FROM user_preferences up
  WHERE
    -- Amount range (defaults are 0..10B in the schema, so this always passes for new users)
    NEW.amount_usd BETWEEN COALESCE(up.min_amount, 0) AND COALESCE(up.max_amount, 10000000000)
    -- Funding types: empty/null = match all
    AND (
      up.funding_types IS NULL
      OR up.funding_types = '{}'
      OR NEW.funding_type = ANY(up.funding_types)
    )
    -- Countries: empty/null = match all
    AND (
      up.countries IS NULL
      OR up.countries = '{}'
      OR NEW.location_country = ANY(up.countries)
    )
    -- Industries: empty/null = match all
    AND (
      up.industries IS NULL
      OR up.industries = '{}'
      OR NEW.industry_tags && up.industries
    )
  ON CONFLICT (user_id, funding_round_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
