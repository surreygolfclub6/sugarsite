-- New conversations a day: Newcomer 3, Member 10, Trusted 15, Champion 30. Champion no longer has an unlimited limit.
update public.tier_rules set daily_conversations = 3  where tier = 'newcomer';
update public.tier_rules set daily_conversations = 10 where tier = 'member';
update public.tier_rules set daily_conversations = 15 where tier = 'trusted';
update public.tier_rules set daily_conversations = 30 where tier = 'champion';
