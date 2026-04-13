-- Fix the handle_new_user trigger to copy full_name from auth.users
-- raw_user_meta_data into profiles.full_name. The signup form has been
-- collecting full_name from day one and passing it via supabase.auth.signUp(
-- options.data.full_name), which lands in raw_user_meta_data, but the
-- trigger was only inserting (id, email) — silently dropping every name.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

-- ----- One-shot backfill for every existing profile -----
-- For each row in profiles where full_name IS NULL but auth.users has a
-- full_name in metadata, copy it over. Idempotent — re-runnable safely.
UPDATE profiles p
SET full_name = u.raw_user_meta_data->>'full_name'
FROM auth.users u
WHERE p.id = u.id
  AND p.full_name IS NULL
  AND u.raw_user_meta_data->>'full_name' IS NOT NULL;
