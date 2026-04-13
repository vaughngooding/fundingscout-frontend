-- Enrich the existing notify_new_signup() trigger with more context.
-- The original was bare-bones (email + plan). Now also include the
-- timestamp and full_name when available. The trigger fires on profiles
-- INSERT, before user_preferences exists, so role/linkedin/filters
-- aren't available at this point — those come in the second trigger
-- below (notify_onboarding_complete).

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
        'type', 'header',
        'text', jsonb_build_object('type', 'plain_text', 'text', '🎉 New FundingScout signup')
      ),
      jsonb_build_object(
        'type', 'section',
        'fields', jsonb_build_array(
          jsonb_build_object('type', 'mrkdwn', 'text', '*Email:*' || E'\n' || NEW.email),
          jsonb_build_object('type', 'mrkdwn', 'text', '*Name:*' || E'\n' || COALESCE(NEW.full_name, '(not set)')),
          jsonb_build_object('type', 'mrkdwn', 'text', '*Plan:*' || E'\n' || COALESCE(NEW.plan, 'free')),
          jsonb_build_object('type', 'mrkdwn', 'text', '*Signed up:*' || E'\n' || TO_CHAR(NOW(), 'Mon DD HH24:MI'))
        )
      ),
      jsonb_build_object(
        'type', 'context',
        'elements', jsonb_build_array(
          jsonb_build_object('type', 'mrkdwn', 'text', '_Onboarding details (role, LinkedIn, filters) will arrive in a second message once they complete signup._')
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
  RAISE WARNING 'notify_new_signup failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ---------- NEW: Onboarding complete notification ----------
-- Fires when a user_preferences row is first populated with meaningful
-- data (linkedin_url, funding_types, or countries set). Sends a follow-up
-- Slack message with the full context that wasn't available at signup
-- time. This is what Vaughn actually cares about — he wants to see
-- "this person finished signup with these specific filters."

CREATE OR REPLACE FUNCTION public.notify_onboarding_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_url TEXT := 'REPLACE_WITH_SLACK_WEBHOOK_URL';  -- redacted; see SECRETS.md
  payload JSONB;
  user_email TEXT;
  user_name TEXT;
  user_plan TEXT;
  filter_summary TEXT;
  channels_summary TEXT;
BEGIN
  -- Only fire on the FIRST time onboarding-meaningful fields go from null to set.
  -- Specifically: when funding_types becomes non-empty for the first time
  -- (since funding_types is the strongest signal that the user actually
  -- went through the onboarding form).
  IF (OLD.funding_types IS NULL OR array_length(OLD.funding_types, 1) IS NULL)
     AND (NEW.funding_types IS NOT NULL AND array_length(NEW.funding_types, 1) > 0)
  THEN
    -- Fetch user profile info
    SELECT email, full_name, plan
      INTO user_email, user_name, user_plan
      FROM profiles WHERE id = NEW.user_id;

    -- Build filter summary
    filter_summary := '';
    IF NEW.min_amount IS NOT NULL AND NEW.max_amount IS NOT NULL THEN
      filter_summary := filter_summary || '$' || (NEW.min_amount / 1000000) || 'M – $' || (NEW.max_amount / 1000000) || 'M';
    END IF;
    IF NEW.funding_types IS NOT NULL THEN
      filter_summary := filter_summary || E'\n*Stages:* ' || array_to_string(NEW.funding_types, ', ');
    END IF;
    IF NEW.countries IS NOT NULL AND array_length(NEW.countries, 1) > 0 THEN
      filter_summary := filter_summary || E'\n*Countries:* ' || array_to_string(NEW.countries, ', ');
    END IF;
    IF NEW.industries IS NOT NULL AND array_length(NEW.industries, 1) > 0 THEN
      filter_summary := filter_summary || E'\n*Industries:* ' || array_to_string(NEW.industries, ', ');
    END IF;

    -- Build channels summary
    channels_summary := '';
    IF NEW.slack_webhook_url IS NOT NULL OR NEW.slack_channel_email IS NOT NULL THEN
      channels_summary := channels_summary || ':slack: Slack ';
    END IF;
    IF NEW.teams_webhook_url IS NOT NULL OR NEW.teams_channel_email IS NOT NULL THEN
      channels_summary := channels_summary || '🟦 Teams ';
    END IF;
    IF NEW.telegram_chat_id IS NOT NULL THEN
      channels_summary := channels_summary || '✈️ Telegram ';
    END IF;
    IF NEW.phone_verified = true AND NEW.phone_number IS NOT NULL THEN
      channels_summary := channels_summary || '📱 SMS ';
    END IF;
    IF channels_summary = '' THEN
      channels_summary := '_(none yet — email digest only)_';
    END IF;

    payload := jsonb_build_object(
      'text', '📋 ' || user_email || ' completed onboarding',
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'header',
          'text', jsonb_build_object('type', 'plain_text', 'text', '📋 Onboarding complete')
        ),
        jsonb_build_object(
          'type', 'section',
          'fields', jsonb_build_array(
            jsonb_build_object('type', 'mrkdwn', 'text', '*Email:*' || E'\n' || user_email),
            jsonb_build_object('type', 'mrkdwn', 'text', '*Name:*' || E'\n' || COALESCE(user_name, '(not set)')),
            jsonb_build_object('type', 'mrkdwn', 'text', '*Plan:*' || E'\n' || COALESCE(user_plan, 'free')),
            jsonb_build_object('type', 'mrkdwn', 'text', '*LinkedIn:*' || E'\n' || COALESCE(NEW.linkedin_url, '_(not set)_'))
          )
        ),
        jsonb_build_object(
          'type', 'section',
          'text', jsonb_build_object('type', 'mrkdwn', 'text', '*Filters:*' || E'\n' || COALESCE(NULLIF(filter_summary, ''), '_(none)_'))
        ),
        jsonb_build_object(
          'type', 'section',
          'text', jsonb_build_object('type', 'mrkdwn', 'text', '*Channels:* ' || channels_summary)
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
  RAISE WARNING 'notify_onboarding_complete failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_preferences_onboarding_complete ON public.user_preferences;
CREATE TRIGGER on_user_preferences_onboarding_complete
  AFTER UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_onboarding_complete();

-- Also fire on INSERT for the case where onboarding writes an entirely
-- new row (which it does — upsert). Same function handles it.
DROP TRIGGER IF EXISTS on_user_preferences_first_insert ON public.user_preferences;
CREATE TRIGGER on_user_preferences_first_insert
  AFTER INSERT ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_onboarding_complete();
