-- Remembers that a member has had the welcome email, so it is only ever sent once. Members who are already live are
-- marked as welcomed, so they don't get a "you're in" email long after the fact.
alter table public.profiles add column welcomed_at timestamptz;
update public.profiles set welcomed_at = now() where status = 'active';
