-- Send a photo in a conversation.
--
-- A message can carry one of the sender's own approved photos (public or private), with or without text. Sending it lets
-- the other person in that conversation see that one photo, nothing else of the sender's private set.

alter table public.messages add column if not exists photo_id uuid references public.photos (id) on delete set null;
create index if not exists messages_photo_idx on public.messages (photo_id) where photo_id is not null;

-- The text can be empty when a photo is attached, but a message must have one or the other. A photo that is later
-- deleted leaves the message with neither, so only newly inserted rows are held to this (not valid) check.
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check check (char_length(body) <= 2000);
alter table public.messages add constraint messages_has_content check (char_length(body) > 0 or photo_id is not null) not valid;

grant insert (photo_id) on public.messages to authenticated;

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
    -- only your own approved photos
    and (photo_id is null or exists (
      select 1 from photos ph where ph.id = messages.photo_id and ph.user_id = auth.uid() and ph.moderation = 'approved'
    ))
  );

-- The other person in the conversation can see a photo that was sent to them there, for as long as it stays approved.
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
        or exists (
          select 1 from messages m join conversations c on c.id = m.conversation_id
          where m.photo_id = photos.id and (c.user_a = auth.uid() or c.user_b = auth.uid())
        )
      )
    )
  );
