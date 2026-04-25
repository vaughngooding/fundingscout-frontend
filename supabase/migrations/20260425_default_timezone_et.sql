-- Default new users to Eastern Time + 8pm digest hour.
-- Most US users are in ET; the Settings UI lets them switch to CT or PT.
-- Using IANA name (America/New_York) so DST is handled automatically.

alter table public.profiles alter column timezone set default 'America/New_York';
alter table public.user_preferences alter column digest_hour set default 20;

-- Backfill existing profiles where timezone is null or set to UTC (the previous default
-- when set from a server component running on Vercel). Don't touch profiles where the user
-- has explicitly picked a non-UTC timezone — those are intentional.
update public.profiles
set timezone = 'America/New_York'
where timezone is null or timezone = 'UTC';

-- Backfill digest_hour for any existing preferences with NULL, so they don't fall through
-- to the function's hard-coded default and the value is visible in the Settings UI.
update public.user_preferences
set digest_hour = 20
where digest_hour is null;
