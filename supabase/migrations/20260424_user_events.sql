-- Page-tracker event log for the admin Engagement tab.
-- Captures page_view, heartbeat, and session_end events for both
-- logged-in users (via user_id) and anonymous landing visitors
-- (via hashed visitor_id, no PII stored).

create table if not exists public.user_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  visitor_id text,
  session_id text not null,
  event_type text not null check (event_type in ('page_view', 'heartbeat', 'session_end')),
  page_path text not null,
  referrer text,
  duration_ms integer,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists user_events_user_id_idx on public.user_events (user_id, created_at desc);
create index if not exists user_events_visitor_id_idx on public.user_events (visitor_id, created_at desc);
create index if not exists user_events_created_at_idx on public.user_events (created_at desc);
create index if not exists user_events_session_id_idx on public.user_events (session_id);

alter table public.user_events enable row level security;
-- Intentionally no policies: only the service-role key can read/write.
-- The /api/track endpoint inserts via service-role, the admin page
-- reads via service-role. End users never touch this table directly.
