-- An invited friend counts as soon as they are a real member (approved, age checked, with a photo and a complete profile),
-- with no waiting period. They stop counting if they are suspended or leave, or have been inactive for 30 days, so a
-- member's level follows who is actually still here.

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
        -- counts at once, and stops counting if the friend goes quiet for 30 days (suspended or deleted friends drop out too)
        and coalesce(p.last_active_at, p.activated_at) > now() - interval '30 days'
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
