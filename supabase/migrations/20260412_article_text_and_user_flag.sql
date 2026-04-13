-- Store the full article text on funding_rounds for post-hoc audit verification.
-- The pipeline fetches up to 15-20K chars of article markdown via exa_fetcher.py;
-- currently discarded after Claude extracts from it. Storing it lets the watchdog
-- verify fields without re-fetching (articles change, go offline, or get paywalled).
ALTER TABLE funding_rounds
  ADD COLUMN IF NOT EXISTS article_text TEXT;

-- User flag on user_alerts for ground-truth feedback.
-- Users can flag alerts as not-funding, duplicate, or incorrect via the dashboard.
-- The watchdog reviews new flags each run.
ALTER TABLE user_alerts
  ADD COLUMN IF NOT EXISTS user_flag TEXT
    CHECK (user_flag IS NULL OR user_flag IN ('not_funding', 'duplicate', 'incorrect_details'));

ALTER TABLE user_alerts
  ADD COLUMN IF NOT EXISTS user_flag_at TIMESTAMPTZ;
