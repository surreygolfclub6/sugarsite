-- Deleting a photo that was sent in a chat failed: the message that carried it was photo-only, and with the photo gone it
-- would have had no content, which the messages_has_content check refuses. Those messages now say "Photo removed" instead,
-- so the photo can be deleted and the conversation keeps its place.

create or replace function public.photos_detach_messages()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update messages set body = 'Photo removed', photo_id = null
   where photo_id = old.id and coalesce(body, '') = '';
  return old;
end;
$$;
revoke all on function public.photos_detach_messages() from public, anon, authenticated;

create trigger photos_detach_messages before delete on public.photos
  for each row execute function public.photos_detach_messages();
