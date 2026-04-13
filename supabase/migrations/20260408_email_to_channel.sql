-- Add channel-email forwarding addresses for users who can't install custom
-- Slack/Teams apps in their corporate workspace. Both Slack and Microsoft
-- Teams provide a built-in feature where any channel has an email address
-- that, when emailed, posts the email content into the channel as Slackbot
-- or Teams Bot. This bypasses the app-installation approval that locks
-- enterprise users out.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS slack_channel_email TEXT,
  ADD COLUMN IF NOT EXISTS teams_channel_email TEXT;
