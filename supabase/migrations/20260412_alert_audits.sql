-- alert_audits: stores quality audit results from the watchdog.
-- Each row is a single funding_round re-evaluated for accuracy.
-- The watchdog samples recent rounds and uses a skeptical Claude prompt
-- to verify classification + field-level accuracy.

CREATE TABLE alert_audits (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_round_id         UUID        NOT NULL REFERENCES funding_rounds(id) ON DELETE CASCADE,
  watchdog_run_id          UUID,
  -- Classification: is this actually a funding round?
  classification           TEXT        CHECK (classification IN ('FUNDING', 'NOT_FUNDING', 'UNCERTAIN')),
  classification_reasoning TEXT,
  -- Field-level accuracy: per-field verdicts
  -- e.g. {"company_name": "CORRECT", "amount_usd": "INCORRECT", "website": "UNVERIFIABLE"}
  field_verdicts           JSONB,
  -- Field-level notes explaining discrepancies
  -- e.g. {"amount_usd": "Article says $5M, we stored $50M"}
  field_notes              JSONB,
  -- Dedup: potential duplicates found via fuzzy matching
  -- e.g. [{"funding_round_id": "...", "company_name": "Acme", "similarity": 0.95}]
  potential_duplicates     JSONB,
  -- Latency: published_date -> created_at delta
  latency_seconds          INT,
  -- Overall accuracy: fraction of auditable fields that are CORRECT
  accuracy_score           NUMERIC(3,2),
  -- Audit metadata
  audit_model              TEXT,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alert_audits_created ON alert_audits (created_at DESC);
CREATE INDEX idx_alert_audits_classification ON alert_audits (classification);
CREATE INDEX idx_alert_audits_funding_round ON alert_audits (funding_round_id);
