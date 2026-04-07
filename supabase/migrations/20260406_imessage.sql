-- iMessage delivery channel
-- Adds per-user opt-in flag and per-alert delivery marker.
--
-- The Mac dispatcher (imessage_dispatcher.py) polls user_alerts WHERE
-- imessage_sent_at IS NULL AND user has imessage_enabled. This is a
-- separate marker from the cloud dispatcher's status='sent' so the two
-- never race against each other.

-- Per-user opt-in for iMessage delivery
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS imessage_enabled BOOLEAN DEFAULT false;

-- Per-alert delivery marker for iMessage
ALTER TABLE user_alerts
  ADD COLUMN IF NOT EXISTS imessage_sent_at TIMESTAMPTZ;

-- Partial index — only rows pending iMessage dispatch.
-- Keeps the dispatcher query fast even as user_alerts grows.
CREATE INDEX IF NOT EXISTS idx_user_alerts_imessage_pending
  ON user_alerts (user_id, created_at)
  WHERE imessage_sent_at IS NULL;
