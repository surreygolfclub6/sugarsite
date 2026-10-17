-- Account approval (testing phase) and authenticator-app login for admins.

-- 1. New profile statuses. Order of a new member: incomplete -> pending_review (age check) -> awaiting_approval -> active.
alter type public.profile_status add value if not exists 'awaiting_approval';
alter type public.profile_status add value if not exists 'declined';

-- A database flag, so approval can be switched off at launch without a deploy:
--   update app_flags set value = false where key = 'require_approval';
insert into public.app_flags (key, value) values ('require_approval', true)
  on conflict (key) do update set value = excluded.value;

-- 2. Is the signed-in user an admin account, whatever the session's assurance level? The app uses this to send an
--    admin who hasn't entered their code yet to the right screen.
create or replace function public.is_admin_user(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select uid = auth.uid() and exists (select 1 from admins where user_id = uid);
$$;
revoke all on function public.is_admin_user(uuid) from public, anon;
grant execute on function public.is_admin_user(uuid) to authenticated;

-- 3. Admin powers in row-level security (reading every profile, photo, conversation and report) now need a session that
--    has passed the authenticator check (aal2). A stolen admin password on its own opens nothing.
create or replace function public.is_admin(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select uid = auth.uid()
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    and exists (select 1 from admins where user_id = uid);
$$;
