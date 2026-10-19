-- Every step of the age check, so we can see why members get stuck. No personal data: only the outcome, and what the
-- age-check service said about the check itself (level, threshold, country). Server only.

create table public.age_check_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  outcome text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index age_check_events_user_idx on public.age_check_events (user_id, created_at desc);
alter table public.age_check_events enable row level security;
revoke all on public.age_check_events from public, anon, authenticated;
