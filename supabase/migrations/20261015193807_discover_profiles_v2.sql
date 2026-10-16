drop function discover_profiles(int, int, int, text, int, int);

-- Discover feed with a chosen search area and multi-select filters. SECURITY INVOKER: RLS still
-- hides inactive and blocked members, and only a distance band leaves the database.
-- Within one filter any selected value matches; different filters must all match. Empty or null = no filter.
-- center_place: the area to search around (null = the member's own place). max_miles null = anywhere.
create or replace function discover_profiles(
  age_min int default 18,
  age_max int default 99,
  max_miles int default null,
  center_place int default null,
  genders text[] default null,
  goals text[] default null,
  body_types text[] default null,
  hair_colours text[] default null,
  relationship_statuses text[] default null,
  ethnicities text[] default null,
  height_min int default null,
  height_max int default null,
  page_offset int default 0,
  page_size int default 24
)
returns table (
  id uuid,
  display_name text,
  age int,
  city text,
  headline text,
  relationship_goals text[],
  height_cm int,
  distance_miles int,
  liked boolean
)
language sql
stable
set search_path = public, extensions
as $$
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
    p.headline,
    p.relationship_goals,
    p.height_cm,
    case when me.center is null or b.location is null then null
         else greatest(5, ceil(st_distance(me.center, b.location) / 1609.344 / 5) * 5)::int end,
    exists (select 1 from likes l where l.from_user = me.id and l.to_user = p.id)
  from me
  join profiles p on p.id <> me.id
  left join uk_places b on b.id = p.place_id
  where me.status = 'active'
    and p.status = 'active'
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
  order by st_distance(me.center, b.location) nulls last, p.created_at desc
  limit least(page_size, 49) offset greatest(page_offset, 0);
$$;
revoke execute on function discover_profiles(int, int, int, int, text[], text[], text[], text[], text[], text[], int, int, int, int) from public;
grant execute on function discover_profiles(int, int, int, int, text[], text[], text[], text[], text[], text[], int, int, int, int) to authenticated;
