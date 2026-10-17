-- Delete a conversation, for yourself. The other person keeps their copy, and moderators can still see the whole
-- conversation if it is reported (reports are read with the server's key, not through this policy).
--
-- Deleting records the time. Messages up to then are hidden from that member; anything sent afterwards shows as normal,
-- so the conversation comes back, empty of history, if the other person writes again. Deleting does not give back any of
-- the day's new conversations, and it doesn't change levels.

create table if not exists public.conversation_clears (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  cleared_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table public.conversation_clears enable row level security;
revoke all on public.conversation_clears from anon, authenticated;
grant select on public.conversation_clears to authenticated;
drop policy if exists conversation_clears_select on public.conversation_clears;
create policy conversation_clears_select on public.conversation_clears for select to authenticated using (user_id = auth.uid());

create or replace function public.clear_conversation(conv uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from conversations c where c.id = conv and auth.uid() in (c.user_a, c.user_b)) then
    raise exception 'This conversation is not available';
  end if;
  insert into conversation_clears (conversation_id, user_id, cleared_at) values (conv, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set cleared_at = now();
end;
$$;
revoke all on function public.clear_conversation(uuid) from public, anon;
grant execute on function public.clear_conversation(uuid) to authenticated;

-- Messages you have deleted are no longer readable by you (the conversation list and the thread both read through this).
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated using (
  exists (
    select 1 from conversations c
    where c.id = messages.conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
  and not exists (
    select 1 from conversation_clears cc
    where cc.conversation_id = messages.conversation_id and cc.user_id = auth.uid() and messages.created_at <= cc.cleared_at
  )
);

-- A photo sent in a conversation you have since deleted is no longer open to you either.
create or replace function public.photo_sent_to_me(photo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from messages m join conversations c on c.id = m.conversation_id
    where m.photo_id = photo and (c.user_a = auth.uid() or c.user_b = auth.uid())
      and not exists (select 1 from conversation_clears cc where cc.conversation_id = m.conversation_id and cc.user_id = auth.uid() and m.created_at <= cc.cleared_at)
  );
$$;
