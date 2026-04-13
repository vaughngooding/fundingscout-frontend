-- Per-round enrichment metadata for CEO + website fields.
--
-- The website column already exists but is sparsely populated (mostly empty
-- strings) because the article fetcher strips <a href> tags before Claude
-- sees the content. Two new code paths fix that: (1) markdownify the HTML
-- so links survive extraction, (2) Exa-search fallback for the gaps.
--
-- We track HOW each field was sourced so we can audit hit rates after
-- shipping and decide whether the cheap stack is good enough or whether
-- we need to add a paid enrichment vendor later.

ALTER TABLE funding_rounds
  ADD COLUMN IF NOT EXISTS ceo_name TEXT,
  ADD COLUMN IF NOT EXISTS website_source TEXT,    -- 'article' | 'exa_funding_context' | 'exa_general' | 'exa_linkedin' | NULL
  ADD COLUMN IF NOT EXISTS ceo_source TEXT,        -- 'article' | 'exa_with_domain' | 'exa_with_city' | 'exa_general' | NULL
  ADD COLUMN IF NOT EXISTS enrichment_attempted_at TIMESTAMPTZ;

-- Index for the backfill script + future re-enrichment scheduling
CREATE INDEX IF NOT EXISTS idx_funding_rounds_enrichment_pending
  ON funding_rounds (created_at DESC)
  WHERE enrichment_attempted_at IS NULL;
