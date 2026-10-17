-- Named searches a member can save and come back to. Each one is the filter query string the search form produces
-- (the same keys the app already validates), plus the sort order. Private to the member.
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  query text not null check (char_length(query) <= 1500),
  sort text not null default 'nearest' check (sort in ('nearest', 'active', 'newest')),
  created_at timestamptz not null default now()
);
create unique index if not exists saved_searches_name_idx on public.saved_searches (user_id, lower(name));
create index if not exists saved_searches_user_idx on public.saved_searches (user_id, created_at desc);

alter table public.saved_searches enable row level security;
revoke all on public.saved_searches from anon, authenticated;
grant select, delete on public.saved_searches to authenticated;
grant insert (user_id, name, query, sort) on public.saved_searches to authenticated;
grant update (name, query, sort) on public.saved_searches to authenticated;

create policy saved_searches_select on public.saved_searches for select to authenticated using (user_id = auth.uid());
create policy saved_searches_insert on public.saved_searches for insert to authenticated with check (user_id = auth.uid());
create policy saved_searches_update on public.saved_searches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_searches_delete on public.saved_searches for delete to authenticated using (user_id = auth.uid());

-- At most 20 per member, so the list stays useful and the table can't be filled up.
create or replace function public.limit_saved_searches() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from saved_searches where user_id = new.user_id) >= 20 then
    raise exception 'You can save up to 20 searches';
  end if;
  return new;
end;
$$;
revoke execute on function public.limit_saved_searches() from public, anon, authenticated;
create trigger saved_searches_limit before insert on public.saved_searches
  for each row execute function public.limit_saved_searches();
