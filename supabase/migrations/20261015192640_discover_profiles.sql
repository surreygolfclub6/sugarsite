-- Discover feed. SECURITY INVOKER: RLS still hides inactive and blocked members,
-- and only a distance band (nearest 5 miles up) leaves the database, never coordinates.
create or replace function discover_profiles(
  age_min int default 18,
  age_max int default 99,
  max_miles int default 50,
  goal text default null,
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
  distance_miles int,
  liked boolean
)
language sql
stable
set search_path = public, extensions
as $$
  select
    p.id,
    p.display_name,
    date_part('year', age(p.birthdate))::int,
    p.city,
    p.headline,
    p.relationship_goals,
    case when a.location is null or b.location is null then null
         else greatest(5, ceil(st_distance(a.location, b.location) / 1609.344 / 5) * 5)::int end,
    exists (select 1 from likes l where l.from_user = me.id and l.to_user = p.id)
  from profiles me
  left join uk_places a on a.id = me.place_id
  join profiles p on p.id <> me.id
  left join uk_places b on b.id = p.place_id
  where me.id = auth.uid()
    and me.status = 'active'
    and p.status = 'active'
    and me.seeking @> array[p.gender]
    and p.seeking @> array[me.gender]
    and p.birthdate <= current_date - make_interval(years => age_min)
    and p.birthdate > current_date - make_interval(years => age_max + 1)
    and (a.location is null or b.location is null or st_dwithin(a.location, b.location, max_miles * 1609.344))
    and (goal is null or goal = any (p.relationship_goals))
  order by st_distance(a.location, b.location) nulls last, p.created_at desc
  limit least(page_size, 48) offset greatest(page_offset, 0);
$$;
revoke execute on function discover_profiles(int, int, int, text, int, int) from public;
grant execute on function discover_profiles(int, int, int, text, int, int) to authenticated;
