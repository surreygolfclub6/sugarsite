alter table photos
  add column rejection_reason text,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add constraint rejection_reason_valid check (rejection_reason is null or rejection_reason in
    ('not_you', 'explicit', 'inappropriate', 'low_quality', 'underage', 'other'));

-- The review queue reads pending photos oldest first.
create index photos_pending_idx on photos (created_at) where moderation = 'pending';
