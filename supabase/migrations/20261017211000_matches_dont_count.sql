-- A conversation with a match never counts towards the daily limit on new conversations, in the limit check or in the
-- "used today" number members see. (The limit check already let matches through; this stops them using up a slot.)

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
  -- conversations I started in the last 24 hours, leaving out the ones with matches
  select count(*) into started_today
  from conversations c
  where c.started_by = me and c.created_at > now() - interval '24 hours'
    and not exists (select 1 from likes mine join likes theirs on theirs.from_user = mine.to_user and theirs.to_user = mine.from_user
                    where mine.from_user = me and mine.to_user = case when c.user_a = me then c.user_b else c.user_a end);
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

create or replace function public.my_progress() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); m record; cur tier_rules; nxt tier_rules; started int; matches int;
begin
  if me is null then return null; end if;
  select * into m from member_metrics(me);
  select * into cur from tier_rules where tier = member_tier(me);
  select * into nxt from tier_rules where rank = cur.rank + 1;
  select count(*)::int into started
  from conversations c
  where c.started_by = me and c.created_at > now() - interval '24 hours'
    and not exists (select 1 from likes mine join likes theirs on theirs.from_user = mine.to_user and theirs.to_user = mine.from_user
                    where mine.from_user = me and mine.to_user = case when c.user_a = me then c.user_b else c.user_a end);
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
