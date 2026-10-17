-- Security hardening from the October 2026 audit.

-- ---------------------------------------------------------------------------
-- 1. SECURITY DEFINER helpers only answer questions about the caller.
--    They are used in RLS policies (always with auth.uid()), so nothing legitimate changes.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select uid = auth.uid() and exists (select 1 from admins where user_id = uid);
$$;

create or replace function public.has_entitlement(uid uuid, feat text) returns boolean
language sql stable security definer set search_path = public as $$
  select uid = auth.uid() and (
    not coalesce((select value from app_flags where key = 'paywall_enabled'), false)
    or exists (
      select 1 from entitlements e
      where e.user_id = uid
        and e.feature = feat
        and (e.granted_until is null or e.granted_until > now())
    )
  );
$$;

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() in (a, b) and exists (
    select 1 from blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Exact birthdate and consent records are no longer readable by other members.
--    Ages come from discover_profiles() and member_ages(), which return the age only.
-- ---------------------------------------------------------------------------
revoke select on public.profiles from authenticated, anon;
grant select (
  id, display_name, gender, seeking, city, place_id, headline, bio, looking_for,
  relationship_status, relationship_goals, height_cm, body_type, hair_colour, ethnicity,
  status, id_verified, photo_verified, last_active_at, created_at, updated_at
) on public.profiles to authenticated;

create or replace function public.member_ages(ids uuid[]) returns table (id uuid, age integer)
language sql stable security definer set search_path = public as $$
  select p.id, date_part('year', age(p.birthdate))::int
  from profiles p
  where auth.uid() is not null
    and cardinality(ids) <= 100
    and p.id = any (ids)
    and (p.id = auth.uid() or (p.status = 'active' and not is_blocked_between(auth.uid(), p.id)));
$$;
revoke all on function public.member_ages(uuid[]) from public, anon;
grant execute on function public.member_ages(uuid[]) to authenticated;

-- discover_profiles reads birthdate, so it now runs with definer rights. Because that bypasses
-- RLS, the "not blocked" rule that RLS used to apply is written out explicitly.
create or replace function public.discover_profiles(
  age_min integer default 18, age_max integer default 99, max_miles integer default null,
  center_place integer default null, genders text[] default null, goals text[] default null,
  body_types text[] default null, hair_colours text[] default null,
  relationship_statuses text[] default null, ethnicities text[] default null,
  height_min integer default null, height_max integer default null,
  sort_by text default 'nearest', page_offset integer default 0, page_size integer default 24
) returns table (id uuid, display_name text, age integer, city text, distance_miles integer,
                 liked boolean, photo_count integer, online boolean)
language sql stable security definer set search_path = public, extensions as $$
  with me as (
    select m.id, m.gender, m.seeking, m.status,
           coalesce(
             (select c.location from uk_places c where c.id = center_place),
             (select o.location from uk_places o where o.id = m.place_id)
           ) as center
    from profiles m
    where m.id = auth.uid()
  )
  select
    p.id,
    p.display_name,
    date_part('year', age(p.birthdate))::int,
    p.city,
    case when me.center is null or b.location is null then null
         else greatest(5, ceil(st_distance(me.center, b.location) / 1609.344 / 5) * 5)::int end,
    exists (select 1 from likes l where l.from_user = me.id and l.to_user = p.id),
    (select count(*)::int from photos ph where ph.user_id = p.id and ph.moderation = 'approved'),
    coalesce(p.last_active_at > now() - interval '10 minutes', false)
  from me
  join profiles p on p.id <> me.id
  left join uk_places b on b.id = p.place_id
  where me.status = 'active'
    and p.status = 'active'
    and not is_blocked_between(me.id, p.id)
    and me.seeking @> array[p.gender]
    and p.seeking @> array[me.gender]
    and p.birthdate <= current_date - make_interval(years => age_min)
    and p.birthdate > current_date - make_interval(years => age_max + 1)
    and (max_miles is null or me.center is null or b.location is null
         or st_dwithin(me.center, b.location, max_miles * 1609.344))
    and (coalesce(cardinality(genders), 0) = 0 or p.gender = any (genders))
    and (coalesce(cardinality(goals), 0) = 0 or p.relationship_goals && goals)
    and (coalesce(cardinality(body_types), 0) = 0 or p.body_type = any (body_types))
    and (coalesce(cardinality(hair_colours), 0) = 0 or p.hair_colour = any (hair_colours))
    and (coalesce(cardinality(relationship_statuses), 0) = 0 or p.relationship_status = any (relationship_statuses))
    and (coalesce(cardinality(ethnicities), 0) = 0 or p.ethnicity = any (ethnicities))
    and (height_min is null or p.height_cm >= height_min)
    and (height_max is null or p.height_cm <= height_max)
  order by
    case when sort_by = 'active' then p.last_active_at end desc nulls last,
    case when sort_by = 'newest' then p.created_at end desc,
    case when sort_by not in ('active', 'newest') then st_distance(me.center, b.location) end nulls last,
    p.created_at desc,
    p.id
  limit least(page_size, 49) offset greatest(page_offset, 0);
$$;

-- ---------------------------------------------------------------------------
-- 3. Messages: members can't choose id, created_at or read_at (the rate limit counts created_at),
--    and suspended or incomplete members can't send.
-- ---------------------------------------------------------------------------
revoke insert, delete on public.messages from authenticated, anon;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and has_entitlement(auth.uid(), 'messaging')
    and exists (select 1 from profiles me where me.id = auth.uid() and me.status = 'active')
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
        and not is_blocked_between(c.user_a, c.user_b)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Likes: only active members can like.
-- ---------------------------------------------------------------------------
drop policy if exists likes_insert on public.likes;
create policy likes_insert on public.likes for insert to authenticated
  with check (
    from_user = auth.uid()
    and not is_blocked_between(from_user, to_user)
    and exists (select 1 from profiles me where me.id = auth.uid() and me.status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 5. Photos: a row can only point at a file in the member's own folder, and members
--    can't write moderation fields.
-- ---------------------------------------------------------------------------
revoke update on public.photos from authenticated, anon;
revoke insert on public.photos from authenticated, anon;
grant insert (user_id, storage_path, position) on public.photos to authenticated;

drop policy if exists photos_insert_own on public.photos;
create policy photos_insert_own on public.photos for insert to authenticated
  with check (
    user_id = auth.uid()
    and moderation = 'pending'
    and storage_path like auth.uid()::text || '/%'
    and storage_path not like '%..%'
  );

-- ---------------------------------------------------------------------------
-- 6. Reports: members can't set status or timestamps, and can't edit reports at all.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.reports from authenticated, anon;
grant insert (reporter, reported, reason, details, source, conversation_id) on public.reports to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Conversations remember who started them, so the daily cap counts empty chats too.
-- ---------------------------------------------------------------------------
alter table public.conversations
  add column if not exists started_by uuid references public.profiles (id) on delete set null;

create or replace function public.start_conversation(other uuid, daily_cap integer default 5)
returns uuid language plpgsql security definer set search_path = public as $$
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
  where c.started_by = me
    and c.created_at > now() - interval '1 day'
    and not exists (select 1 from messages m where m.conversation_id = c.id and m.sender_id <> me);
  if not has_entitlement(me, 'unlimited_messaging') and started_today >= daily_cap then
    raise exception 'Daily limit for new conversations reached';
  end if;

  insert into conversations (user_a, user_b, started_by) values (a, b, me) returning id into conv;
  return conv;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Least privilege. Members get only what the app uses; anonymous visitors get nothing.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update, delete on public.admins from authenticated;
revoke all on public.admins from authenticated;
revoke insert, update, delete on public.app_flags from authenticated;
revoke insert, update, delete on public.entitlements from authenticated;
revoke insert, update, delete on public.uk_places from authenticated;
revoke delete on public.conversations from authenticated;
revoke insert, update, delete on public.conversations from authenticated;
revoke delete on public.profiles from authenticated;
revoke insert on public.profiles from authenticated;

-- Trigger functions never need to be callable through the API.
revoke execute on function public.enforce_adult() from public, anon, authenticated;
revoke execute on function public.enforce_message_rate() from public, anon, authenticated;
revoke execute on function public.enforce_photo_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Storage: photos must be .jpg and a member can hold at most 12 files, so the bucket
--    can't be filled with files the photo limit doesn't see.
-- ---------------------------------------------------------------------------
drop policy if exists "photos upload own folder" on storage.objects;
create policy "photos upload own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(name) like '%.jpg'
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'photos' and (storage.foldername(o.name))[1] = auth.uid()::text
    ) < 12
  );
