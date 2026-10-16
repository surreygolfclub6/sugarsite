-- Max 6 photos per member, enforced in the database.
-- (The policy-based count recursed; 20261015190556 replaces it with a trigger.)
drop policy photos_insert_own on photos;
create policy photos_insert_own on photos for insert to authenticated
  with check (
    user_id = auth.uid()
    and moderation = 'pending'
    and (select count(*) from photos p where p.user_id = auth.uid()) < 6
  );

-- The browser re-encodes every photo to JPEG, so the bucket only accepts JPEG up to 5 MB.
update storage.buckets
  set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg']
  where id = 'photos';
