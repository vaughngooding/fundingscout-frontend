-- Notify Vaughn via Slack on every new signup and every Pro upgrade.
--
-- Architecture: pg_net.http_post is async (queued to a background worker),
-- so this never blocks the signup transaction. If Slack is down or slow,
-- the user still gets a fast signup; the notification just queues.
--
-- SECRET HANDLING: the webhook URL is redacted in this file. The live
-- function body inside Supabase still contains the real URL — this file
-- is the historical migration record, but it diverges from what's running.
-- Real URL is in ~/vault/secrets/ (or rotate if ever exposed).
-- See SECRETS.md at the repo root.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------- New signup ----------
CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_url TEXT := 'REPLACE_WITH_SLACK_WEBHOOK_URL';  -- redacted; see SECRETS.md
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'text', '🎉 New FundingScout signup: ' || NEW.email,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'type', 'section',
        'text', jsonb_build_object(
          'type', 'mrkdwn',
          'text', '🎉 *New FundingScout signup*' || E'\n' ||
                  '*Email:* ' || NEW.email || E'\n' ||
                  '*Plan:* ' || COALESCE(NEW.plan, 'free')
        )
      )
    )
  );

  PERFORM net.http_post(
    url := webhook_url,
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a notification failure block signup.
  RAISE WARNING 'notify_new_signup failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ---------- Plan upgrade (free → pro) ----------
CREATE OR REPLACE FUNCTION public.notify_pro_upgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_url TEXT := 'REPLACE_WITH_SLACK_WEBHOOK_URL';  -- redacted; see SECRETS.md
  payload JSONB;
BEGIN
  -- Only fire on actual transitions into 'pro'
  IF OLD.plan IS DISTINCT FROM NEW.plan AND NEW.plan = 'pro' THEN
    payload := jsonb_build_object(
      'text', '💰 NEW PRO USER: ' || NEW.email,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'section',
          'text', jsonb_build_object(
            'type', 'mrkdwn',
            'text', '💰 *NEW PRO USER* 🚀' || E'\n' ||
                    '*Email:* ' || NEW.email || E'\n' ||
                    '*Upgraded from:* ' || COALESCE(OLD.plan, 'free')
          )
        )
      )
    );

    PERFORM net.http_post(
      url := webhook_url,
      body := payload,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_pro_upgrade failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ---------- Triggers (idempotent) ----------
DROP TRIGGER IF EXISTS on_profile_created_notify ON public.profiles;
CREATE TRIGGER on_profile_created_notify
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_signup();

DROP TRIGGER IF EXISTS on_profile_plan_upgraded_notify ON public.profiles;
CREATE TRIGGER on_profile_plan_upgraded_notify
  AFTER UPDATE OF plan ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pro_upgrade();
