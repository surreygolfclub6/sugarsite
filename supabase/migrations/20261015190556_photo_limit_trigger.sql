-- A policy can't count its own table without recursing, so cap photos with a trigger.
drop policy photos_insert_own on photos;
create policy photos_insert_own on photos for insert to authenticated
  with check (user_id = auth.uid() and moderation = 'pending');

create or replace function enforce_photo_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from photos where user_id = new.user_id) >= 6 then
    raise exception 'You can add up to 6 photos';
  end if;
  return new;
end;
$$;

create trigger photos_enforce_limit
  before insert on photos
  for each row execute function enforce_photo_limit();
