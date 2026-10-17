-- Levels (contribution tiers) and referrals.
--
-- Free usage is limited until a member earns more by contributing: a photo, a complete profile, replying to people,
-- and inviting friends who become real members. Limits are enforced here, in the database, from the member's own
-- record. Nothing the caller sends can raise them.

-- ---------------------------------------------------------------------------
-- 1. When a profile went live (used for the new-member grace week and for judging referrals).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists activated_at timestamptz;
update public.profiles set activated_at = created_at where status = 'active' and activated_at is null;

create or replace function public.set_activated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'active' and old.status is distinct from 'active' and new.activated_at is null then
    new.activated_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.set_activated_at() from public, anon, authenticated;
drop trigger if exists profiles_activated on public.profiles;
create trigger profiles_activated before update of status on public.profiles
  for each row execute function public.set_activated_at();

-- ---------------------------------------------------------------------------
-- 2. A personal invite code for every member, generated automatically. Not readable through the API: the app
--    reads your own code on the server, so nobody can list other members' codes.
-- ---------------------------------------------------------------------------
create or replace function public.new_referral_code() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- no 0, 1, I, L, O
  bytes bytea := gen_random_bytes(8);
  code text := '';
  i int;
begin
  for i in 0..7 loop
    code := code || substr(alphabet, 1 + (get_byte(bytes, i) % 31), 1);
  end loop;
  return code;
end;
$$;
revoke execute on function public.new_referral_code() from public, anon, authenticated;

alter table public.profiles add column if not exists referral_code text unique default public.new_referral_code();
update public.profiles set referral_code = public.new_referral_code() where referral_code is null;
alter table public.profiles alter column referral_code set not null;

-- ---------------------------------------------------------------------------
-- 3. Who invited whom. Written and read by server code only. Whether a referral "counts" is worked out from the
--    friend's current state, so a friend who is later suspended stops counting without anyone having to clean up.
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  referred_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (referrer_id <> referred_id)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;

-- Called by the server when a new member signs up through an invite link. Returns false (and records nothing) for an
-- unknown code, a code from a member who isn't live, or a self-referral.
create or replace function public.record_referral(referred uuid, code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  select id into r from profiles where referral_code = upper(trim(code)) and status = 'active';
  if r is null or r = referred then return false; end if;
  insert into referrals (referrer_id, referred_id) values (r, referred) on conflict (referred_id) do nothing;
  return found;
end;
$$;
revoke all on function public.record_referral(uuid, text) from public, anon, authenticated;
grant execute on function public.record_referral(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. The levels. This table is the single source of the numbers; the app shows them, the functions below enforce them.
-- ---------------------------------------------------------------------------
create table if not exists public.tier_rules (
  tier text primary key,
  rank int not null unique,
  label text not null,
  daily_conversations int not null,
  likes_per_hour int not null,
  min_replies int not null,
  min_referrals int not null,
  needs_photo boolean not null,
  needs_profile boolean not null
);
alter table public.tier_rules enable row level security;
revoke all on public.tier_rules from anon, authenticated;
grant select on public.tier_rules to authenticated;
drop policy if exists tier_rules_select on public.tier_rules;
create policy tier_rules_select on public.tier_rules for select to authenticated using (true);

insert into public.tier_rules (tier, rank, label, daily_conversations, likes_per_hour, min_replies, min_referrals, needs_photo, needs_profile) values
  ('newcomer', 1, 'Newcomer',  2,  30,  0, 0, false, false),
  ('member',   2, 'Member',    5,  80,  3, 0, true,  true),
  ('trusted',  3, 'Trusted',  12, 120, 10, 1, true,  true),
  ('champion', 4, 'Champion', 25, 160, 25, 3, true,  true)
on conflict (tier) do update set
  rank = excluded.rank, label = excluded.label, daily_conversations = excluded.daily_conversations,
  likes_per_hour = excluded.likes_per_hour, min_replies = excluded.min_replies, min_referrals = excluded.min_referrals,
  needs_photo = excluded.needs_photo, needs_profile = excluded.needs_profile;

-- ---------------------------------------------------------------------------
-- 5. What a member has done. Internal: only other functions call it.
-- ---------------------------------------------------------------------------
create or replace function public.member_metrics(uid uuid)
returns table (is_active boolean, in_grace boolean, has_photo boolean, profile_ok boolean, replies int,
               referrals_joined int, referrals_qualified int, upheld_reports int)
language sql stable security definer set search_path = public as $$
  select
    coalesce((select p.status = 'active' from profiles p where p.id = uid), false),
    -- the first week after going live counts as Member, so nobody is judged while still setting up
    coalesce((select p.activated_at > now() - interval '7 days' from profiles p where p.id = uid), false),
    exists (select 1 from photos ph where ph.user_id = uid and ph.moderation = 'approved'),
    coalesce((select p.headline is not null and char_length(p.headline) >= 5
                 and p.bio is not null and char_length(p.bio) >= 40
                 and p.looking_for is not null and char_length(p.looking_for) >= 20
                 and p.place_id is not null and cardinality(p.relationship_goals) > 0
              from profiles p where p.id = uid), false),
    -- people they have replied to in the last 60 days: conversations where they wrote back after the other person
    (select count(*)::int from conversations c
      where uid in (c.user_a, c.user_b)
        and exists (select 1 from messages mine
                    where mine.conversation_id = c.id and mine.sender_id = uid
                      and mine.created_at > now() - interval '60 days'
                      and exists (select 1 from messages theirs
                                  where theirs.conversation_id = c.id and theirs.sender_id <> uid
                                    and theirs.created_at < mine.created_at))),
    (select count(*)::int from referrals r where r.referrer_id = uid),
    -- a friend counts once they're a real member: live for a week, age checked, with a photo and a complete profile
    (select count(*)::int from referrals r join profiles p on p.id = r.referred_id
      where r.referrer_id = uid and p.status = 'active' and p.age_verified
        and p.activated_at <= now() - interval '7 days'
        and exists (select 1 from photos ph where ph.user_id = p.id and ph.moderation = 'approved')
        and p.headline is not null and char_length(p.headline) >= 5
        and p.bio is not null and char_length(p.bio) >= 40
        and p.looking_for is not null and char_length(p.looking_for) >= 20
        and p.place_id is not null and cardinality(p.relationship_goals) > 0),
    (select count(*)::int from reports rp
      where rp.reported = uid and rp.status = 'actioned' and rp.created_at > now() - interval '90 days');
$$;
revoke all on function public.member_metrics(uuid) from public, anon, authenticated;

create or replace function public.member_tier(uid uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare m record; r tier_rules; best tier_rules; floor_rank int;
begin
  select * into m from member_metrics(uid);
  select * into best from tier_rules where rank = 1;
  if not coalesce(m.is_active, false) then return best.tier; end if;
  for r in select * from tier_rules order by rank loop
    if (not r.needs_photo or m.has_photo)
       and (not r.needs_profile or m.profile_ok)
       and m.replies >= r.min_replies
       and m.referrals_qualified >= r.min_referrals then
      best := r;
    end if;
  end loop;
  -- grace week: at least Member
  select rank into floor_rank from tier_rules where tier = 'member';
  if m.in_grace and best.rank < floor_rank then select * into best from tier_rules where tier = 'member'; end if;
  -- an upheld report in the last 90 days caps a member at Member
  if m.upheld_reports > 0 and best.rank > floor_rank then select * into best from tier_rules where tier = 'member'; end if;
  return best.tier;
end;
$$;
revoke all on function public.member_tier(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. What members can see: their own progress, and other members' level badges.
-- ---------------------------------------------------------------------------
create or replace function public.my_progress() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); m record; cur tier_rules; nxt tier_rules; started int;
begin
  if me is null then return null; end if;
  select * into m from member_metrics(me);
  select * into cur from tier_rules where tier = member_tier(me);
  select * into nxt from tier_rules where rank = cur.rank + 1;
  select count(*)::int into started from conversations where started_by = me and created_at > now() - interval '24 hours';
  return jsonb_build_object(
    'tier', cur.tier, 'label', cur.label, 'rank', cur.rank,
    'daily_conversations', cur.daily_conversations, 'likes_per_hour', cur.likes_per_hour,
    'started_today', started, 'in_grace', m.in_grace, 'upheld_reports', m.upheld_reports,
    'metrics', jsonb_build_object(
      'has_photo', m.has_photo, 'profile_ok', m.profile_ok, 'replies', m.replies,
      'referrals_joined', m.referrals_joined, 'referrals_qualified', m.referrals_qualified),
    'next', case when nxt.tier is null then null else jsonb_build_object(
      'tier', nxt.tier, 'label', nxt.label, 'daily_conversations', nxt.daily_conversations,
      'likes_per_hour', nxt.likes_per_hour, 'needs_photo', nxt.needs_photo, 'needs_profile', nxt.needs_profile,
      'min_replies', nxt.min_replies, 'min_referrals', nxt.min_referrals) end);
end;
$$;
revoke all on function public.my_progress() from public, anon;
grant execute on function public.my_progress() to authenticated;

create or replace function public.member_tiers(ids uuid[]) returns table (id uuid, tier text, label text, rank int)
language sql stable security definer set search_path = public as $$
  select p.id, r.tier, r.label, r.rank
  from profiles p
  join lateral (select t.tier, t.label, t.rank from tier_rules t where t.tier = member_tier(p.id)) r on true
  where auth.uid() is not null
    and cardinality(ids) <= 100
    and p.id = any (ids)
    and (p.id = auth.uid() or (is_active_member() and p.status = 'active' and not is_blocked_between(auth.uid(), p.id)));
$$;
revoke all on function public.member_tiers(uuid[]) from public, anon;
grant execute on function public.member_tiers(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Enforcement.
--    - New conversations a day come from the member's level, not from anything the caller passes. The old
--      daily_cap argument is ignored (it stays only so existing callers don't break). Replies are never limited.
--    - "Unlimited" now needs a real entitlement row. It used to be skipped for everyone while the paywall flag was
--      off, which meant the daily limit never applied.
--    - Likes an hour also come from the level.
-- ---------------------------------------------------------------------------
create or replace function public.start_conversation(other uuid, daily_cap integer default 5)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  conv uuid;
  started_today int;
  rl tier_rules;
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

  select * into rl from tier_rules where tier = member_tier(me);
  select count(*) into started_today from conversations where started_by = me and created_at > now() - interval '24 hours';
  if started_today >= rl.daily_conversations
     and not exists (select 1 from entitlements e where e.user_id = me and e.feature = 'unlimited_messaging'
                     and (e.granted_until is null or e.granted_until > now())) then
    raise exception 'You have started % new conversations in the last 24 hours, which is the limit for a % member. Replying is always unlimited. Add a photo, complete your profile, reply to messages and invite friends to unlock more.',
      rl.daily_conversations, rl.label;
  end if;

  insert into conversations (user_a, user_b, started_by) values (a, b, me) returning id into conv;
  return conv;
end;
$$;

create or replace function public.enforce_like_rate() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int;
begin
  select likes_per_hour into cap from tier_rules where tier = member_tier(new.from_user);
  if (select count(*) from likes where from_user = new.from_user and created_at > now() - interval '1 hour') >= cap then
    raise exception 'You are liking too quickly';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_like_rate() from public, anon, authenticated;
