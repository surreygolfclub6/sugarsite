-- Moderators see every member in search, whatever the filters.

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
  where (
      -- A moderator (signed in with their authenticator code) sees every member, whatever the filters, orientation,
      -- blocks or status, so nobody is hidden from review.
      (is_admin(me.id) and p.status <> 'incomplete')
      or (
        me.status = 'active'
        and p.status = 'active'
        and not is_blocked_between(me.id, p.id)
        and me.seeking @> array[p.gender]
        and p.seeking @> array[me.gender]
      )
    )
    and (is_admin(me.id) or (p.birthdate <= current_date - make_interval(years => age_min)
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
    and (height_max is null or p.height_cm <= height_max)))
  order by
    case when sort_by = 'active' then p.last_active_at end desc nulls last,
    case when sort_by = 'newest' then p.created_at end desc,
    case when sort_by not in ('active', 'newest') then st_distance(me.center, b.location) end nulls last,
    p.created_at desc,
    p.id
  limit least(page_size, 49) offset greatest(page_offset, 0);
$$;
