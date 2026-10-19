-- Failed sign-ins, kept as hashes (never the address or IP itself) so repeated guessing can be slowed down per account and per IP.
-- Only the server (service role) touches this; members and the public API have no access.

create table public.login_failures (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index login_failures_email_idx on public.login_failures (email_hash, created_at desc);
create index login_failures_ip_idx on public.login_failures (ip_hash, created_at desc);
alter table public.login_failures enable row level security;
revoke all on public.login_failures from public, anon, authenticated;

-- Seconds the caller must still wait. 5 free failures per account (20 per IP) in the last hour, then the wait doubles with
-- each further failure (30s, 1m, 2m, ...) up to 15 minutes, counted from the latest failure.
create or replace function public.login_wait_seconds(p_email text, p_ip text)
returns integer language sql stable security definer set search_path = public as $$
  with e as (
    select count(*)::int n, max(created_at) last_at from login_failures
     where email_hash = p_email and created_at > now() - interval '1 hour'
  ), i as (
    select count(*)::int n, max(created_at) last_at from login_failures
     where ip_hash = p_ip and created_at > now() - interval '1 hour'
  ), w as (
    select
      case when e.n > 5 then least(900, 30 * power(2, least(e.n - 6, 10))::int) - extract(epoch from now() - e.last_at)::int else 0 end as by_email,
      case when i.n > 20 then least(900, 30 * power(2, least(i.n - 21, 10))::int) - extract(epoch from now() - i.last_at)::int else 0 end as by_ip
    from e, i
  )
  select greatest(0, by_email, by_ip) from w;
$$;

create or replace function public.record_login_failure(p_email text, p_ip text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into login_failures (email_hash, ip_hash) values (p_email, p_ip);
  delete from login_failures where created_at < now() - interval '1 day';
end;
$$;

create or replace function public.clear_login_failures(p_email text)
returns void language sql security definer set search_path = public as $$
  delete from login_failures where email_hash = p_email;
$$;

revoke all on function public.login_wait_seconds(text, text), public.record_login_failure(text, text), public.clear_login_failures(text) from public, anon, authenticated;
grant execute on function public.login_wait_seconds(text, text), public.record_login_failure(text, text), public.clear_login_failures(text) to service_role;
