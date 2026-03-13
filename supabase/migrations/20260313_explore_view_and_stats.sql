-- ============================================================
-- Phase 1: Explore page — view, stats function, indexes, RLS
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Indexes for fast grouping and sorting
CREATE INDEX IF NOT EXISTS idx_funding_rounds_company_lower
  ON funding_rounds (LOWER(TRIM(company_name)));

CREATE INDEX IF NOT EXISTS idx_funding_rounds_created_at_desc
  ON funding_rounds (created_at DESC);

-- 2. Company summary view (entity resolution via LOWER(TRIM))
--    Uses a CTE to pick the "best" row per company (highest confidence, most recent)
--    then joins aggregated stats.
CREATE OR REPLACE VIEW company_summary AS
WITH best_row AS (
  SELECT DISTINCT ON (LOWER(TRIM(company_name)))
    LOWER(TRIM(company_name)) AS slug,
    company_name              AS display_name,
    location,
    location_country,
    website
  FROM funding_rounds
  ORDER BY LOWER(TRIM(company_name)), confidence_score DESC, created_at DESC
),
agg AS (
  SELECT
    LOWER(TRIM(company_name))  AS slug,
    COUNT(*)                   AS round_count,
    SUM(amount_usd)            AS total_raised,
    MAX(amount_usd)            AS largest_round,
    MIN(created_at)            AS first_seen,
    MAX(created_at)            AS last_seen,
    MAX(confidence_score)      AS best_confidence
  FROM funding_rounds
  GROUP BY LOWER(TRIM(company_name))
),
inv AS (
  SELECT
    LOWER(TRIM(fr.company_name)) AS slug,
    ARRAY_AGG(DISTINCT i)        AS all_investors
  FROM funding_rounds fr, UNNEST(fr.investors) AS i
  GROUP BY LOWER(TRIM(fr.company_name))
),
tags AS (
  SELECT
    LOWER(TRIM(fr.company_name)) AS slug,
    ARRAY_AGG(DISTINCT t)        AS all_industry_tags
  FROM funding_rounds fr, UNNEST(fr.industry_tags) AS t
  GROUP BY LOWER(TRIM(fr.company_name))
)
SELECT
  b.slug,
  b.display_name,
  a.round_count,
  a.total_raised,
  a.largest_round,
  a.first_seen,
  a.last_seen,
  a.best_confidence,
  b.location,
  b.location_country,
  b.website,
  i.all_investors,
  t.all_industry_tags
FROM best_row b
JOIN agg a USING (slug)
LEFT JOIN inv i USING (slug)
LEFT JOIN tags t USING (slug);

-- 3. Stats RPC function for the explore page header
CREATE OR REPLACE FUNCTION get_explore_stats()
RETURNS JSON
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'total_rounds',    COUNT(*),
    'total_capital',   COALESCE(SUM(amount_usd), 0),
    'avg_round_size',  COALESCE(AVG(amount_usd)::bigint, 0),
    'unique_companies', COUNT(DISTINCT LOWER(TRIM(company_name))),
    'top_industries',  (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT tag, COUNT(*) AS cnt
        FROM funding_rounds fr2, UNNEST(fr2.industry_tags) AS tag
        WHERE fr2.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY tag
        ORDER BY cnt DESC
        LIMIT 5
      ) t
    )
  )
  FROM funding_rounds
  WHERE created_at >= NOW() - INTERVAL '90 days';
$$;

-- 4. RLS policy: allow anonymous read on funding_rounds (for landing page preview)
-- Only SELECT, and the query itself limits to 10 rows
CREATE POLICY "Allow anonymous read on funding_rounds"
  ON funding_rounds
  FOR SELECT
  TO anon
  USING (true);

-- 5. RLS policy: allow anonymous to call the stats function
-- (functions with SECURITY INVOKER need SELECT on underlying tables — covered above)

-- 6. Grant anon access to the view
GRANT SELECT ON company_summary TO anon;
GRANT SELECT ON company_summary TO authenticated;
