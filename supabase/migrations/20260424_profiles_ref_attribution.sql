-- Add `ref` column to profiles for marketing attribution.
-- Captures the UTM-style ?ref=<platform>-<YYYYMMDD> param from the URL on signup,
-- so we can attribute signups to specific marketing posts (TikTok / LinkedIn / X).
-- The fundingscout-marketing repo's metrics-collector reads this column on Sundays.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ref TEXT;

-- Update handle_new_user to copy ref from auth.users raw_user_meta_data
-- (signup form passes it via supabase.auth.signUp options.data.ref).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, ref)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'ref'
  );
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

-- Backfill ref from auth.users raw_user_meta_data for any pre-existing profiles
-- where ref is NULL but the metadata had it. Idempotent.
UPDATE profiles p
SET ref = u.raw_user_meta_data->>'ref'
FROM auth.users u
WHERE p.id = u.id
  AND p.ref IS NULL
  AND u.raw_user_meta_data->>'ref' IS NOT NULL;
