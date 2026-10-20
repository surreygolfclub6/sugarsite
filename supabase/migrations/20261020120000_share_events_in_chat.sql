-- Sharing private photos shows up in the conversation, and a conversation with a share in it appears in the list even if nobody
-- has written yet. A conversation you have deleted stays gone until something newer happens.

alter publication supabase_realtime add table public.photo_shares;

create or replace function public.my_conversations()
returns table(id uuid, other_id uuid, other_name text, other_online boolean, last_body text, last_at timestamptz, last_from_me boolean, unread integer)
language sql stable set search_path to 'public' as $$
  select
    c.id,
    o.id,
    o.display_name,
    coalesce(o.last_active_at > now() - interval '10 minutes', false),
    case when sh.at is not null and sh.at > coalesce(lm.created_at, '-infinity')
         then case when sh.owner_id = auth.uid() then 'You shared your private photos' else 'Shared their private photos with you' end
         else lm.body end,
    greatest(lm.created_at, sh.at),
    case when sh.at is not null and sh.at > coalesce(lm.created_at, '-infinity') then false else lm.sender_id = auth.uid() end,
    (select count(*)::int from messages m
       where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.read_at is null)
  from conversations c
  join profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join lateral (
    select m.body, m.created_at, m.sender_id
    from messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select s.created_at as at, s.owner_id
    from photo_shares s
    where ((s.owner_id = c.user_a and s.viewer_id = c.user_b) or (s.owner_id = c.user_b and s.viewer_id = c.user_a))
      and s.created_at > coalesce((select cc.cleared_at from conversation_clears cc where cc.conversation_id = c.id and cc.user_id = auth.uid()), '-infinity')
    order by s.created_at desc
    limit 1
  ) sh on true
  where (c.user_a = auth.uid() or c.user_b = auth.uid())
    and (lm.created_at is not null or sh.at is not null)
  order by greatest(lm.created_at, sh.at) desc;
$$;
