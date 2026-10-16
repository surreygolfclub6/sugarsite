-- Keep the conversation's last_message_at current. Members can't update conversations,
-- so this runs as the table owner and does only that.
create or replace function touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
revoke execute on function touch_conversation() from public;

create trigger messages_touch_conversation
  after insert on messages
  for each row execute function touch_conversation();

-- Flood control: at most 20 messages a minute per member. Runs as the sender, so RLS applies.
create or replace function enforce_message_rate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'You are sending messages too quickly';
  end if;
  return new;
end;
$$;

create trigger messages_rate_limit
  before insert on messages
  for each row execute function enforce_message_rate();

create index messages_unread_idx on messages (conversation_id) where read_at is null;

-- Conversation list for the signed-in member. SECURITY INVOKER: RLS hides conversations with
-- members who are inactive or blocked, and only conversations that have messages are listed.
create or replace function my_conversations()
returns table (
  id uuid,
  other_id uuid,
  other_name text,
  other_online boolean,
  last_body text,
  last_at timestamptz,
  last_from_me boolean,
  unread int
)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    o.id,
    o.display_name,
    coalesce(o.last_active_at > now() - interval '10 minutes', false),
    lm.body,
    lm.created_at,
    lm.sender_id = auth.uid(),
    (select count(*)::int from messages m
       where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.read_at is null)
  from conversations c
  join profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  join lateral (
    select m.body, m.created_at, m.sender_id
    from messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where c.user_a = auth.uid() or c.user_b = auth.uid()
  order by lm.created_at desc;
$$;
revoke execute on function my_conversations() from public;
grant execute on function my_conversations() to authenticated;

-- Unread messages across all of the member's conversations, for the tab badge.
create or replace function unread_count()
returns int
language sql
stable
set search_path = public
as $$
  select count(*)::int
  from messages m
  join conversations c on c.id = m.conversation_id
  where (c.user_a = auth.uid() or c.user_b = auth.uid())
    and m.sender_id <> auth.uid()
    and m.read_at is null;
$$;
revoke execute on function unread_count() from public;
grant execute on function unread_count() to authenticated;
