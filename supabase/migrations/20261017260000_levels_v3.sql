-- Levels, third version: invited friends are the backbone.
--
--   Member    a photo, a complete profile, 2 conversations, 1 invited friend who has become a real member
--   Trusted   5 conversations, 3 invited friends, a good response record
--   Champion  10 conversations, 10 invited friends, a good response record, and no daily limit on new conversations
--
-- A match counts as a conversation, so liking people is a way to progress as well as to say hello. A friend counts as a real
-- member after 3 days live (it was 7), once they have passed the age check, been approved, and added a photo and a profile.

update public.tier_rules set daily_conversations = 2,   min_conversations = 0,  min_referrals = 0  where tier = 'newcomer';
update public.tier_rules set daily_conversations = 5,   min_conversations = 2,  min_referrals = 1  where tier = 'member';
update public.tier_rules set daily_conversations = 12,  min_conversations = 5,  min_referrals = 3  where tier = 'trusted';
update public.tier_rules set daily_conversations = 500, min_conversations = 10, min_referrals = 10 where tier = 'champion';

create or replace function public.member_metrics(uid uuid)
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
    -- people who wrote to this member first, and how many of them were answered
    count(*) filter (where theirs_first is not null and (mine_first is null or theirs_first < mine_first)),
    count(*) filter (where theirs_first is not null and (mine_first is null or theirs_first < mine_first)
                       and mine_last is not null and mine_last > theirs_first)
  into received, answered from c;

  -- A conversation counts once both people have written (whoever started it), and so does a match, once per person.
  select count(*) into convs from (
    select case when x.user_a = uid then x.user_b else x.user_a end as other
      from conversations x
     where uid in (x.user_a, x.user_b)
       and exists (select 1 from messages m where m.conversation_id = x.id and m.sender_id = uid and m.created_at > now() - interval '60 days')
       and exists (select 1 from messages m where m.conversation_id = x.id and m.sender_id <> uid and m.created_at > now() - interval '60 days')
    union
    select mine.to_user from likes mine
      join likes theirs on theirs.from_user = mine.to_user and theirs.to_user = mine.from_user
     where mine.from_user = uid
  ) t;

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
        and p.activated_at <= now() - interval '3 days'
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

-- A level with 100 or more new conversations a day has no limit (Champion).
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
  if rl.daily_conversations < 100
     and started_today >= rl.daily_conversations
     and not exists (select 1 from entitlements e where e.user_id = me and e.feature = 'unlimited_messaging'
                     and (e.granted_until is null or e.granted_until > now()))
     and not exists (select 1 from likes mine join likes theirs on theirs.from_user = mine.to_user and theirs.to_user = mine.from_user
                     where mine.from_user = me and mine.to_user = other) then
    raise exception 'You have started % new conversations in the last 24 hours, which is the limit for a % member. Replying is always unlimited, and so is messaging a match. Invite friends and have conversations to unlock more.',
      rl.daily_conversations, rl.label;
  end if;

  insert into conversations (user_a, user_b, started_by) values (a, b, me) returning id into conv;
  return conv;
end;
$$;
