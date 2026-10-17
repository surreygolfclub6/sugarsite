-- Abuse limits and an audit trail, from the final security audit.

-- Likes and blocks: members can't choose created_at (the rate limits count it), and can't edit rows.
revoke update on public.likes from authenticated, anon;
revoke update on public.blocks from authenticated, anon;
revoke insert on public.likes from authenticated, anon;
grant insert (from_user, to_user) on public.likes to authenticated;
revoke insert on public.blocks from authenticated, anon;
grant insert (blocker, blocked, blocked_name) on public.blocks to authenticated;

create or replace function public.enforce_like_rate() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from likes where from_user = new.from_user and created_at > now() - interval '1 hour') >= 80 then
    raise exception 'You are liking too quickly';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_like_rate() from public, anon, authenticated;
drop trigger if exists likes_rate_limit on public.likes;
create trigger likes_rate_limit before insert on public.likes for each row execute function public.enforce_like_rate();

create or replace function public.enforce_block_rate() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from blocks where blocker = new.blocker and created_at > now() - interval '1 hour') >= 50 then
    raise exception 'You are blocking too quickly';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_block_rate() from public, anon, authenticated;
drop trigger if exists blocks_rate_limit on public.blocks;
create trigger blocks_rate_limit before insert on public.blocks for each row execute function public.enforce_block_rate();

-- Every moderator action is recorded: who did what to whom, and when. Written by server code only.
create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_user uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists moderation_log_created_idx on public.moderation_log (created_at desc);
alter table public.moderation_log enable row level security;
revoke all on public.moderation_log from anon, authenticated;
