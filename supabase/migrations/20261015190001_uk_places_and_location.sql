create extension if not exists postgis with schema extensions;

-- Reference data from GeoNames (CC BY 4.0). Loaded by scripts/import-places.mjs.
create table uk_places (
  id int primary key,                 -- GeoNames id
  name text not null,
  ascii_name text not null,
  county text,
  nation text not null,
  population int not null default 0,
  location extensions.geography(point, 4326) not null
);
create index uk_places_location_idx on uk_places using gist (location);
create index uk_places_name_idx on uk_places (lower(ascii_name) text_pattern_ops);

alter table uk_places enable row level security;
create policy uk_places_select on uk_places for select to authenticated using (true);

-- Autocomplete. SECURITY INVOKER, so it runs under the caller's RLS.
create or replace function search_uk_places(q text)
returns table (id int, name text, county text, nation text)
language sql
stable
set search_path = public
as $$
  select p.id, p.name, p.county, p.nation
  from uk_places p
  where lower(p.ascii_name) like lower(q) || '%'
  order by p.population desc, p.name
  limit 8;
$$;
revoke execute on function search_uk_places(text) from public;
grant execute on function search_uk_places(text) to authenticated;

-- A member's place is city-level, the same precision as the city shown on their profile.
alter table profiles add column place_id int references uk_places (id);
create index profiles_place_idx on profiles (place_id);

-- Location is set by server code from a verified place, never edited directly.
revoke update (city) on profiles from authenticated;
