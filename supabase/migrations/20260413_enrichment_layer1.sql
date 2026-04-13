-- Layer 1 enrichment: extract company description, founded year, and
-- employee range from the article text during Claude extraction.
-- Zero additional API cost — these fields are pulled from the same
-- Claude Haiku call that already runs on every article.

ALTER TABLE funding_rounds ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE funding_rounds ADD COLUMN IF NOT EXISTS founded_year INT;
ALTER TABLE funding_rounds ADD COLUMN IF NOT EXISTS employee_range TEXT;
