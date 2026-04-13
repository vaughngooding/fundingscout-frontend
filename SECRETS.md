# Secrets handling in this repo

This repo does **not** store live secrets. When you see `REPLACE_WITH_...`
placeholders in migration SQL files, the real value is held outside git.

## Where real values live

| Secret | Real location |
|---|---|
| `SLACK_SIGNUP_WEBHOOK` (signup + Pro upgrade notifications) | Embedded in live Postgres function bodies inside Supabase; also kept in `~/vault/secrets/` on the Mac Mini |
| Supabase `anon` / `service_role` keys | `.env.local` (gitignored) |
| Anthropic / Exa / Twitter / Twilio keys | `~/Vibecoding/Vibecoding/Funding Alerts/.env` (gitignored) |

## Known divergence: migration files vs live Supabase

The following migrations were originally written with the real Slack
webhook URL hardcoded. They **already ran** against the live Supabase
project, so the deployed Postgres functions contain the real URL in
their function bodies. The on-disk files have been scrubbed to satisfy
GitHub Push Protection — they are the historical record of what the
functions *do*, not a runnable deployment artifact.

If you need to re-apply one of these migrations (new project, disaster
recovery), you must substitute the placeholder first:

- `supabase/migrations/20260407_signup_notifications.sql` — lines 21, 61
- `supabase/migrations/20260408_enrich_signup_notifications.sql` — lines 18, 73

## If a secret leaks

Slack incoming webhooks are trivial to rotate: Slack app admin →
regenerate webhook → update the live Supabase function body with
`CREATE OR REPLACE FUNCTION ...` and the new URL → note the rotation
in `~/vault/projects/fundingscout/open-threads.md`.

## Todo (tracked in vault)

- Replace hardcoded webhook with Supabase Vault reference
  (`vault.secrets`) so the function reads the URL at runtime instead
  of embedding it in the function body. Then the SQL migrations can be
  fully authoritative.
