-- SEC EDGAR Form D verification fields. Two purposes:
--   1. Track which funding_rounds rows have been cross-verified against
--      a Form D filing (the legal source of truth for amount + first-sale date)
--   2. Allow the EDGAR scraper to insert NEW rounds we missed via press
--
-- The verified_by_sec flag is set when an EDGAR Form D matches an existing
-- funding_round and we updated the row with EDGAR's authoritative numbers.
-- A "verified" row is exact-amount, exact-date, and exact-issuer-name.

ALTER TABLE funding_rounds
  ADD COLUMN IF NOT EXISTS verified_by_sec BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sec_filing_url TEXT,
  ADD COLUMN IF NOT EXISTS sec_filing_date DATE,
  ADD COLUMN IF NOT EXISTS sec_first_sale_date DATE,
  ADD COLUMN IF NOT EXISTS sec_total_amount_sold BIGINT,
  ADD COLUMN IF NOT EXISTS sec_cik TEXT;

-- Index for the daily runner so it can quickly find rows that haven't
-- been verified yet (so we don't re-cross-reference the same row daily)
CREATE INDEX IF NOT EXISTS idx_funding_rounds_unverified
  ON funding_rounds (created_at DESC)
  WHERE verified_by_sec = false;
