-- A name snapshot lets members see (and undo) who they blocked, even though row-level
-- security hides blocked members' profiles from them.
alter table blocks add column blocked_name text;

alter table reports
  add column source text not null default 'profile' check (source in ('profile', 'message')),
  add column conversation_id uuid references conversations (id) on delete set null,
  add constraint reports_not_self check (reporter <> reported),
  add constraint reports_reason_valid check (reason in
    ('fake_profile', 'scam', 'harassment', 'underage', 'solicitation', 'other')),
  add constraint reports_details_len check (details is null or char_length(details) <= 1000);

-- One open report per reporter and member; filing another waits until a moderator closes it.
create unique index reports_one_open_per_pair on reports (reporter, reported) where status = 'open';

-- Report flood control: at most 10 a day per member. Runs as the reporter, so RLS applies.
create or replace function enforce_report_rate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from reports where reporter = new.reporter and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have sent too many reports today';
  end if;
  return new;
end;
$$;
revoke execute on function enforce_report_rate() from public, anon, authenticated;

create trigger reports_rate_limit
  before insert on reports
  for each row execute function enforce_report_rate();
