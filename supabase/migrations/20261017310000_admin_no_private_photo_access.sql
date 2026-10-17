-- Moderators were able to read every photo through the member screens, so a private photo that had not been shared with
-- them still showed on a profile. Moderation never needed that: every admin page reads photos with the server's key.
-- A moderator now sees only what any other member would see (public photos, photos shared with them, photos sent to
-- them in a conversation, and their own) when they use the site as a member.
drop policy if exists photos_select on public.photos;
create policy photos_select on public.photos for select to authenticated
  using (
    user_id = auth.uid()
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
