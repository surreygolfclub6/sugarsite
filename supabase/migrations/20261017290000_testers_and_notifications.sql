-- Testers, email notification settings, and likes in realtime.

-- 1. Testers. A moderator can mark a member as a tester, which gives them Champion limits whatever their record. The
--    column isn't granted to members, so nobody can set it for themselves, and it isn't readable through the API.
alter table public.profiles add column if not exists is_tester boolean not null default false;

create or replace function public.member_tier(uid uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare m record; r tier_rules; best tier_rules; floor_rank int;
begin
  select * into m from member_metrics(uid);
  select * into best from tier_rules where rank = 1;
  if not coalesce(m.is_active, false) then return best.tier; end if;
  if exists (select 1 from profiles where id = uid and is_tester) then return 'champion'; end if;
  for r in select * from tier_rules order by rank loop
    if (not r.needs_photo or m.has_photo)
       and (not r.needs_profile or m.profile_ok)
       and (not r.needs_responsive or m.responsive)
       and m.conversation_count >= r.min_conversations
       and m.referrals_qualified >= r.min_referrals then
      best := r;
    end if;
  end loop;
  select rank into floor_rank from tier_rules where tier = 'member';
  if m.in_grace and best.rank < floor_rank then select * into best from tier_rules where tier = 'member'; end if;
  if m.upheld_reports > 0 and best.rank > floor_rank then select * into best from tier_rules where tier = 'member'; end if;
  return best.tier;
end;
$$;
revoke all on function public.member_tier(uuid) from public, anon, authenticated;

-- 2. Email notifications. Members can turn them off (the app reads and writes this with the server's key, so other
--    members' settings are never exposed). notification_log makes sure someone gets at most one email an hour for a
--    conversation, however many messages arrive; only the server touches it.
alter table public.profiles add column if not exists email_notifications boolean not null default true;

create table if not exists public.notification_log (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  last_sent_at timestamptz not null default now(),
  primary key (conversation_id, recipient_id)
);
alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;

-- 3. Likes arrive in an open conversation as they happen.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'likes') then
    alter publication supabase_realtime add table public.likes;
  end if;
end $$;
