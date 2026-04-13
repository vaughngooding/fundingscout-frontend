-- Add LinkedIn profile URL to user_preferences. Asked for in onboarding,
-- shown in admin /admin/users page so Vaughn can see who his users actually
-- are. Optional — not all users will fill it in.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
