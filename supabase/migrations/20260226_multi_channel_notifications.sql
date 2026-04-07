-- Multi-Channel Notification Expansion
-- Adds columns for Telegram, Web Push, SMS, and Slack App channels

-- Phase 1: Telegram
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_link_token TEXT UNIQUE;

-- Phase 2: Web Push
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- Phase 3: SMS
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
  ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMPTZ;

-- Phase 4: Slack App (OAuth)
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS slack_team_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS slack_app_installed BOOLEAN DEFAULT false;
