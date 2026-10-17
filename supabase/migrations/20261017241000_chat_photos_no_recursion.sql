-- The messages and photos policies read each other's table, which Postgres rejects as infinite recursion, so each check
-- goes through a function that skips row-level security.
create or replace function public.is_own_approved_photo(photo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from photos ph where ph.id = photo and ph.user_id = auth.uid() and ph.moderation = 'approved');
$$;
revoke all on function public.is_own_approved_photo(uuid) from public, anon;
grant execute on function public.is_own_approved_photo(uuid) to authenticated;

create or replace function public.photo_sent_to_me(photo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from messages m join conversations c on c.id = m.conversation_id
    where m.photo_id = photo and (c.user_a = auth.uid() or c.user_b = auth.uid())
  );
$$;
revoke all on function public.photo_sent_to_me(uuid) from public, anon;
grant execute on function public.photo_sent_to_me(uuid) to authenticated;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and has_entitlement(auth.uid(), 'messaging')
    and exists (select 1 from profiles me where me.id = auth.uid() and me.status = 'active')
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
        and not is_blocked_between(c.user_a, c.user_b)
    )
    and (photo_id is null or is_own_approved_photo(photo_id))
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
      and (
        visibility = 'public'
        or exists (select 1 from photo_shares s where s.owner_id = photos.user_id and s.viewer_id = auth.uid())
        or photo_sent_to_me(photos.id)
      )
    )
  );
