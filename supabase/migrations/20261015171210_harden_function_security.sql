-- Fix mutable search_path
create or replace function enforce_adult()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.birthdate is not null and new.birthdate > (current_date - interval '18 years')::date then
    raise exception 'Members must be 18 or over';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user is trigger-only; no one should call it directly.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- These are used internally by RLS policies evaluated as `authenticated`,
-- so authenticated keeps EXECUTE. anon has no legitimate reason to call
-- them directly via RPC.
revoke execute on function public.has_entitlement(uuid, text) from anon;
revoke execute on function public.is_admin(uuid) from anon;
revoke execute on function public.is_blocked_between(uuid, uuid) from anon;
revoke execute on function public.start_conversation(uuid, int) from anon;
