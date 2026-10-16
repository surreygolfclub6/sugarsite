-- Ardor initial schema
-- Run in the Supabase SQL editor, or with `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------
create type profile_status as enum ('incomplete', 'pending_review', 'active', 'suspended');
create type moderation_status as enum ('pending', 'approved', 'rejected');
create type report_status as enum ('open', 'actioned', 'dismissed');

-- ---------------------------------------------------------------
-- Feature flags and entitlements
-- The paywall is a switch: while paywall_enabled is false, every
-- entitlement check passes. Turn it on when subscriptions launch.
-- ---------------------------------------------------------------
create table app_flags (
  key text primary key,
  value boolean not null default false
);
insert into app_flags (key, value) values ('paywall_enabled', false);

create table entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,                -- e.g. 'messaging'
  granted_until timestamptz,            -- null = no expiry
  source text not null default 'manual',-- 'manual' | 'subscription' | 'grandfathered'
  created_at timestamptz not null default now(),
  primary key (user_id, feature)
);

create or replace function has_entitlement(uid uuid, feat text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not coalesce((select value from app_flags where key = 'paywall_enabled'), false)
    or exists (
      select 1 from entitlements e
      where e.user_id = uid
        and e.feature = feat
        and (e.granted_until is null or e.granted_until > now())
    );
$$;

-- ---------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  birthdate date,
  gender text,
  seeking text[] not null default '{}',
  city text,
  headline text,
  bio text,
  looking_for text,                     -- free text: what they want, in their words
  status profile_status not null default 'incomplete',
  id_verified boolean not null default false,
  photo_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint display_name_len check (display_name is null or char_length(display_name) between 2 and 40),
  constraint bio_len check (bio is null or char_length(bio) <= 1200),
  constraint headline_len check (headline is null or char_length(headline) <= 120),
  constraint looking_for_len check (looking_for is null or char_length(looking_for) <= 800)
);

-- Members must be adults. Enforced in the database, not just the form.
create or replace function enforce_adult()
returns trigger
language plpgsql
as $$
begin
  if new.birthdate is not null and new.birthdate > (current_date - interval '18 years')::date then
    raise exception 'Members must be 18 or over';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_enforce_adult
  before insert or update on profiles
  for each row execute function enforce_adult();

-- Every new auth user gets an empty profile to fill during onboarding.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------
create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  moderation moderation_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index photos_user_idx on photos (user_id, position);

-- ---------------------------------------------------------------
-- Likes, blocks, reports
-- ---------------------------------------------------------------
create table likes (
  from_user uuid not null references profiles (id) on delete cascade,
  to_user uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user),
  check (from_user <> to_user)
);
create index likes_to_idx on likes (to_user);

create table blocks (
  blocker uuid not null references profiles (id) on delete cascade,
  blocked uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index blocks_blocked_idx on blocks (blocked);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references profiles (id) on delete cascade,
  reported uuid not null references profiles (id) on delete cascade,
  reason text not null,                 -- 'fake_profile' | 'scam' | 'harassment' | 'underage' | 'solicitation' | 'other'
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);
create index reports_status_idx on reports (status, created_at);

create table admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- ---------------------------------------------------------------
-- Conversations and messages
-- user_a < user_b so each pair has exactly one conversation.
-- ---------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles (id) on delete cascade,
  user_b uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  unique (user_a, user_b),
  check (user_a < user_b)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conv_idx on messages (conversation_id, created_at);

-- ---------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------
create or replace function is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = uid);
$$;

-- Start (or fetch) a conversation. Checks status, blocks, entitlement
-- and the daily cap on new conversations.
create or replace function start_conversation(other uuid, daily_cap int default 5)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  conv uuid;
  started_today int;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if me = other then raise exception 'Cannot message yourself'; end if;
  if not exists (select 1 from profiles where id = me and status = 'active') then
    raise exception 'Complete your profile and verification first';
  end if;
  if not exists (select 1 from profiles where id = other and status = 'active') then
    raise exception 'This member is not available';
  end if;
  if is_blocked_between(me, other) then raise exception 'This member is not available'; end if;
  if not has_entitlement(me, 'messaging') then raise exception 'Messaging needs a subscription'; end if;

  a := least(me, other);
  b := greatest(me, other);

  select id into conv from conversations where user_a = a and user_b = b;
  if conv is not null then return conv; end if;

  select count(*) into started_today
  from conversations c
  join messages m on m.conversation_id = c.id and m.sender_id = me
  where c.created_at > now() - interval '1 day'
    and not exists (
      select 1 from messages m2 where m2.conversation_id = c.id and m2.sender_id <> me
    );
  if not has_entitlement(me, 'unlimited_messaging') and started_today >= daily_cap then
    raise exception 'Daily limit for new conversations reached';
  end if;

  insert into conversations (user_a, user_b) values (a, b) returning id into conv;
  return conv;
end;
$$;

-- ---------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------
alter table profiles enable row level security;
alter table photos enable row level security;
alter table likes enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table entitlements enable row level security;
alter table app_flags enable row level security;
alter table admins enable row level security;

-- Profiles: you see yourself, plus active members who haven't blocked you
-- (and whom you haven't blocked). Admins see everyone.
create policy profiles_select on profiles for select to authenticated using (
  id = auth.uid()
  or is_admin(auth.uid())
  or (status = 'active' and not is_blocked_between(auth.uid(), id))
);
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on profiles for update to authenticated
  using (is_admin(auth.uid()));

-- Members may only edit their own descriptive columns. Status and
-- verification flags are changed by admins or server-side code.
revoke update on profiles from authenticated;
grant update (display_name, birthdate, gender, seeking, city, headline, bio, looking_for)
  on profiles to authenticated;
-- Admins act through the service role for status changes.

-- Photos
create policy photos_select on photos for select to authenticated using (
  user_id = auth.uid()
  or is_admin(auth.uid())
  or (moderation = 'approved'
      and exists (select 1 from profiles p where p.id = user_id and p.status = 'active')
      and not is_blocked_between(auth.uid(), user_id))
);
create policy photos_insert_own on photos for insert to authenticated
  with check (user_id = auth.uid() and moderation = 'pending');
create policy photos_delete_own on photos for delete to authenticated
  using (user_id = auth.uid());

-- Likes
create policy likes_select on likes for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());
create policy likes_insert on likes for insert to authenticated
  with check (from_user = auth.uid() and not is_blocked_between(from_user, to_user));
create policy likes_delete on likes for delete to authenticated
  using (from_user = auth.uid());

-- Blocks
create policy blocks_select on blocks for select to authenticated using (blocker = auth.uid());
create policy blocks_insert on blocks for insert to authenticated with check (blocker = auth.uid());
create policy blocks_delete on blocks for delete to authenticated using (blocker = auth.uid());

-- Reports: members can file them; only admins can read them.
create policy reports_insert on reports for insert to authenticated with check (reporter = auth.uid());
create policy reports_admin_select on reports for select to authenticated using (is_admin(auth.uid()));
create policy reports_admin_update on reports for update to authenticated using (is_admin(auth.uid()));

-- Conversations: created through start_conversation(), read by participants.
create policy conversations_select on conversations for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid() or is_admin(auth.uid()));

-- Messages: participants only, sender must be you, no blocked pairs, entitlement required.
create policy messages_select on messages for select to authenticated using (
  exists (
    select 1 from conversations c
    where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
);
create policy messages_insert on messages for insert to authenticated with check (
  sender_id = auth.uid()
  and has_entitlement(auth.uid(), 'messaging')
  and exists (
    select 1 from conversations c
    where c.id = conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
      and not is_blocked_between(c.user_a, c.user_b)
  )
);
create policy messages_mark_read on messages for update to authenticated using (
  sender_id <> auth.uid()
  and exists (
    select 1 from conversations c
    where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
);
revoke update on messages from authenticated;
grant update (read_at) on messages to authenticated;

-- Entitlements: read your own. Writes come from the billing webhook (service role).
create policy entitlements_select_own on entitlements for select to authenticated
  using (user_id = auth.uid());

-- Flags are readable by signed-in members so the UI can show/hide upgrade prompts.
create policy flags_select on app_flags for select to authenticated using (true);

-- Admins table: no policies, so only the service role can read or write it.

-- ---------------------------------------------------------------
-- Realtime for chat
-- ---------------------------------------------------------------
alter publication supabase_realtime add table messages;

-- ---------------------------------------------------------------
-- Storage: private bucket for photos, one folder per user.
-- Photos are served through signed URLs after moderation.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photos upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
-- Other members' approved photos are served by server code using the
-- service role to create short-lived signed URLs.
