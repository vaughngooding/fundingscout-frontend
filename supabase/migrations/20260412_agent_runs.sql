-- agent_runs: central heartbeat log for every agent in the system.
-- Every agent (scraper, twitter, webhooks, digest, watchdog, imessage)
-- logs every run with timing, output count, and optional learnings.
-- The watchdog queries this table to detect stale agents and zero-output streaks.

CREATE TABLE agent_runs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent       TEXT        NOT NULL,
  run_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INT,
  domain      TEXT,
  items       INT         DEFAULT 0,
  errors      INT         DEFAULT 0,
  learnings   TEXT,
  summary     JSONB       DEFAULT '{}',
  metadata    JSONB       DEFAULT '{}'
);

-- Watchdog queries: "when did agent X last run?"
CREATE INDEX idx_agent_runs_agent_run_at ON agent_runs (agent, run_at DESC);

-- Dashboard / recent runs across all agents
CREATE INDEX idx_agent_runs_run_at ON agent_runs (run_at DESC);
