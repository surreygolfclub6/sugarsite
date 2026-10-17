-- Levels, second version.
--
-- 1. Likes an hour is no longer part of the levels (there aren't enough profiles for it to mean anything). A flat, generous
--    anti-bot limit stays, but members never see it.
-- 2. "Replies" becomes "conversations": a chat where both people have written, whoever started it. A member who isn't
--    receiving messages can still earn their way up by starting conversations that get answered.
-- 3. Trusted and Champion also need a good response record, but it only applies once three people have written to you first.
-- 4. A match (two members who like each other) never uses up the daily limit on new conversations.

-- A flat abuse limit on likes, before the per-level column goes away.
create or replace function public.enforce_like_rate() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from likes where from_user = new.from_user and created_at > now() - interval '1 hour') >= 150 then
    raise exception 'You are liking too quickly';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_like_rate() from public, anon, authenticated;

alter table public.tier_rules rename column min_replies to min_conversations;
alter table public.tier_rules add column if not exists needs_responsive boolean not null default false;
update public.tier_rules set needs_responsive = true where tier in ('trusted', 'champion');
alter table public.tier_rules drop column if exists likes_per_hour;

drop function if exists public.member_metrics(uuid);
create function public.member_metrics(uid uuid)
returns table (is_active boolean, in_grace boolean, has_photo boolean, profile_ok boolean, conversation_count int,
               responsive boolean, referrals_joined int, referrals_qualified int, upheld_reports int)
language plpgsql stable security definer set search_path = public as $$
declare convs int; received int; answered int;
begin
  -- Over the last 60 days, per conversation: when each side first wrote, and when this member last wrote.
  with c as (
    select
      (select min(m.created_at) from messages m where m.conversation_id = x.id and m.sender_id <> uid and m.created_at > now() - interval '60 days') as theirs_first,
      (select min(m.created_at) from messages m where m.conversation_id = x.id and m.sender_id = uid and m.created_at > now() - interval '60 days') as mine_first,
      (select max(m.created_at) from messages m where m.conversation_id = x.id and m.sender_id = uid and m.created_at > now() - interval '60 days') as mine_last
    from conversations x where uid in (x.user_a, x.user_b)
  )
  select
    -- a conversation counts once both people have written, whoever started it
    count(*) filter (where theirs_first is not null and mine_first is not null),
    -- people who wrote to this member first, and how many of them were answered
    count(*) filter (where theirs_first is not null and (mine_first is null or theirs_first < mine_first)),
    count(*) filter (where theirs_first is not null and (mine_first is null or theirs_first < mine_first)
                       and mine_last is not null and mine_last > theirs_first)
  into convs, received, answered from c;

  return query select
    coalesce((select p.status = 'active' from profiles p where p.id = uid), false),
    coalesce((select p.activated_at > now() - interval '7 days' from profiles p where p.id = uid), false),
    exists (select 1 from photos ph where ph.user_id = uid and ph.moderation = 'approved'),
    coalesce((select p.headline is not null and char_length(p.headline) >= 5
                 and p.bio is not null and char_length(p.bio) >= 40
                 and p.looking_for is not null and char_length(p.looking_for) >= 20
                 and p.place_id is not null and cardinality(p.relationship_goals) > 0
              from profiles p where p.id = uid), false),
    convs,
    -- a good response record: nothing to judge until three people have written first, then at least half answered
    (received < 3 or answered * 2 >= received),
    (select count(*)::int from referrals r where r.referrer_id = uid),
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
end;
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
       and (not r.needs_responsive or m.responsive)
       and m.conversation_count >= r.min_conversations
       and m.referrals_qualified >= r.min_referrals then
      best := r;
    end if;
  end loop;
  select rank into floor_rank from tier_rules where tier = 'member';
  if m.in_grace and best.rank < floor_rank then select * into best from tier_rules where tier = 'member'; end if;
  if m.upheld_reports > 0 and best.rank > floor_rank then select * into best from tier_rules where tier = 'member'; end if;
  return best.tier;
end;
$$;
revoke all on function public.member_tier(uuid) from public, anon, authenticated;

create or replace function public.my_progress() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); m record; cur tier_rules; nxt tier_rules; started int; matches int;
begin
  if me is null then return null; end if;
  select * into m from member_metrics(me);
  select * into cur from tier_rules where tier = member_tier(me);
  select * into nxt from tier_rules where rank = cur.rank + 1;
  select count(*)::int into started from conversations where started_by = me and created_at > now() - interval '24 hours';
  select count(*)::int into matches from likes mine join likes theirs on theirs.from_user = mine.to_user and theirs.to_user = mine.from_user where mine.from_user = me;
  return jsonb_build_object(
    'tier', cur.tier, 'label', cur.label, 'rank', cur.rank,
    'daily_conversations', cur.daily_conversations,
    'started_today', started, 'in_grace', m.in_grace, 'upheld_reports', m.upheld_reports, 'matches', matches,
    'metrics', jsonb_build_object(
      'has_photo', m.has_photo, 'profile_ok', m.profile_ok, 'conversations', m.conversation_count, 'responsive', m.responsive,
      'referrals_joined', m.referrals_joined, 'referrals_qualified', m.referrals_qualified),
    'next', case when nxt.tier is null then null else jsonb_build_object(
      'tier', nxt.tier, 'label', nxt.label, 'daily_conversations', nxt.daily_conversations,
      'needs_photo', nxt.needs_photo, 'needs_profile', nxt.needs_profile, 'needs_responsive', nxt.needs_responsive,
      'min_conversations', nxt.min_conversations, 'min_referrals', nxt.min_referrals) end);
end;
$$;
revoke all on function public.my_progress() from public, anon;
grant execute on function public.my_progress() to authenticated;

-- Starting a conversation: the daily limit comes from the member's level, but a match never counts against it.
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
                     and (e.granted_until is null or e.granted_until > now()))
     and not exists (select 1 from likes mine join likes theirs on theirs.from_user = mine.to_user and theirs.to_user = mine.from_user
                     where mine.from_user = me and mine.to_user = other) then
    raise exception 'You have started % new conversations in the last 24 hours, which is the limit for a % member. Replying is always unlimited, and so is messaging a match. Add a photo, complete your profile, have conversations and invite friends to unlock more.',
      rl.daily_conversations, rl.label;
  end if;

  insert into conversations (user_a, user_b, started_by) values (a, b, me) returning id into conv;
  return conv;
end;
$$;
