-- Private photos.
--
-- A photo is public (seen by other live members, as before) or private. A private photo is seen only by its owner,
-- moderators, and members the owner has chosen to share with. Moderators still review every photo before it goes live,
-- public or private. For levels, any approved photo counts, so a member who keeps all their photos private isn't held back.

alter table public.photos add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private'));

-- Members can choose the visibility of their own photos, and nothing else about them.
revoke insert on public.photos from authenticated, anon;
grant insert (user_id, storage_path, position, visibility) on public.photos to authenticated;
grant update (visibility) on public.photos to authenticated;
drop policy if exists photos_update_visibility on public.photos;
create policy photos_update_visibility on public.photos for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Who an owner has shared their private photos with. Sharing is with a person, not a photo: it opens the owner's whole
-- private set to that member until the owner stops sharing.
create table if not exists public.photo_shares (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);
create index if not exists photo_shares_viewer_idx on public.photo_shares (viewer_id);
alter table public.photo_shares enable row level security;
revoke all on public.photo_shares from anon, authenticated;
grant select, delete on public.photo_shares to authenticated;
grant insert (owner_id, viewer_id) on public.photo_shares to authenticated;

drop policy if exists photo_shares_select on public.photo_shares;
create policy photo_shares_select on public.photo_shares for select to authenticated
  using (owner_id = auth.uid() or viewer_id = auth.uid());

-- You can only share your own photos, with a live member you're not blocked with, and only with someone you already
-- have a conversation or a match with, so private photos can't be pushed at strangers.
drop policy if exists photo_shares_insert on public.photo_shares;
create policy photo_shares_insert on public.photo_shares for insert to authenticated
  with check (
    owner_id = auth.uid()
    and is_active_member()
    and not is_blocked_between(owner_id, viewer_id)
    and exists (select 1 from profiles p where p.id = viewer_id and p.status = 'active')
    and (
      exists (select 1 from conversations c
              where least(c.user_a, c.user_b) = least(owner_id, viewer_id) and greatest(c.user_a, c.user_b) = greatest(owner_id, viewer_id))
      or exists (select 1 from likes a join likes b on b.from_user = a.to_user and b.to_user = a.from_user
                 where a.from_user = owner_id and a.to_user = viewer_id)
    )
  );

drop policy if exists photo_shares_delete on public.photo_shares;
create policy photo_shares_delete on public.photo_shares for delete to authenticated
  using (owner_id = auth.uid());

-- Who can see a photo: its owner and admins always; other live members only for approved photos of live members they
-- aren't blocked with, and for private ones only if the owner has shared with them.
drop policy if exists photos_select on public.photos;
create policy photos_select on public.photos for select to authenticated
  using (
    user_id = auth.uid()
    or is_admin(auth.uid())
    or (
      moderation = 'approved'
      and exists (select 1 from profiles p where p.id = photos.user_id and p.status = 'active')
      and not is_blocked_between(auth.uid(), user_id)
      and is_active_member()
      and (
        visibility = 'public'
        or exists (select 1 from photo_shares s where s.owner_id = photos.user_id and s.viewer_id = auth.uid())
      )
    )
  );

-- How many private photos a live member has, so the profile can say "3 private photos" to someone who can't see them yet.
-- Only a number, and only for live members the caller can see.
create or replace function public.private_photo_count(owner uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null or owner = auth.uid() or not is_active_member() or is_blocked_between(auth.uid(), owner)
         or not exists (select 1 from profiles p where p.id = owner and p.status = 'active')
    then 0
    else (select count(*)::int from photos ph where ph.user_id = owner and ph.moderation = 'approved' and ph.visibility = 'private')
  end;
$$;
revoke all on function public.private_photo_count(uuid) from public, anon;
grant execute on function public.private_photo_count(uuid) to authenticated;

-- Search tiles show public photos only, so the photo count on a tile counts public photos only.
create or replace function public.discover_profiles(
  age_min integer default 18, age_max integer default 99, max_miles integer default null,
  center_place integer default null, genders text[] default null, goals text[] default null,
  body_types text[] default null, hair_colours text[] default null,
  relationship_statuses text[] default null, ethnicities text[] default null,
  height_min integer default null, height_max integer default null,
  sort_by text default 'nearest', page_offset integer default 0, page_size integer default 24
) returns table (id uuid, display_name text, age integer, city text, distance_miles integer,
                 liked boolean, photo_count integer, online boolean, age_verified boolean)
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
    (select count(*)::int from photos ph where ph.user_id = p.id and ph.moderation = 'approved' and ph.visibility = 'public'),
    coalesce(p.last_active_at > now() - interval '10 minutes', false),
    p.age_verified
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
