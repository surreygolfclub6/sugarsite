-- When a member agreed to the terms and to the processing of sensitive details, and to which version.
-- Written by server code at sign-up; members have no column grant for these.
alter table profiles
  add column consented_at timestamptz,
  add column consent_version text;
