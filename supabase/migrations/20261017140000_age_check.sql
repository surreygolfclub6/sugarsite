-- Age assurance. A profile only goes live (status 'active') after the member passes an age check with
-- the provider (AgeVerif). Until then the profile is 'pending_review', and the database itself keeps
-- the member from seeing anyone else, so the gate doesn't depend on the app behaving.

-- The result of each check. Only the outcome is kept, never images or ID documents.
-- One verification can back one account, which stops a single person running many fake profiles.
create table public.age_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  provider text not null default 'ageverif',
  verification_uid text not null,
  assurance_level text,
  age_threshold integer not null,
  country text,
  reused boolean,
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (provider, verification_uid)
);
alter table public.age_checks enable row level security;
-- Written and read by server code only (service role); members have no access.
revoke all on public.age_checks from anon, authenticated;

-- True when the signed-in member's own profile is live. Definer rights avoid RLS recursion on profiles.
create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active');
$$;
revoke all on function public.is_active_member() from public, anon;
grant execute on function public.is_active_member() to authenticated;

-- Other members' profiles and photos are only visible to members who are live themselves.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or is_admin(auth.uid())
    or (status = 'active' and not is_blocked_between(auth.uid(), id) and is_active_member())
  );

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
    )
  );

create or replace function public.member_ages(ids uuid[]) returns table (id uuid, age integer)
language sql stable security definer set search_path = public as $$
  select p.id, date_part('year', age(p.birthdate))::int
  from profiles p
  where auth.uid() is not null
    and cardinality(ids) <= 100
    and p.id = any (ids)
    and (
      p.id = auth.uid()
      or (is_active_member() and p.status = 'active' and not is_blocked_between(auth.uid(), p.id))
    );
$$;
