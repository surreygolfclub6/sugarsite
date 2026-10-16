-- EXECUTE is granted to PUBLIC by default; revoking from anon/authenticated
-- directly does nothing while PUBLIC still grants it. Revoke from PUBLIC,
-- then re-grant to authenticated only where actually needed.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.has_entitlement(uuid, text) from public;
revoke execute on function public.is_admin(uuid) from public;
revoke execute on function public.is_blocked_between(uuid, uuid) from public;
revoke execute on function public.start_conversation(uuid, int) from public;

grant execute on function public.has_entitlement(uuid, text) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.start_conversation(uuid, int) to authenticated;
-- handle_new_user stays unreachable by anon and authenticated: trigger-only.
