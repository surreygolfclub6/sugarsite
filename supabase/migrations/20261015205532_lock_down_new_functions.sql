-- Supabase grants new functions to anon and authenticated by default, separately from PUBLIC.
-- Trigger-only function: nobody should call it directly.
revoke execute on function touch_conversation() from anon, authenticated;
revoke execute on function enforce_message_rate() from anon, authenticated;

-- Signed-in-only functions: remove the anonymous grant (authenticated keeps its explicit one).
revoke execute on function my_conversations() from anon;
revoke execute on function unread_count() from anon;
revoke execute on function distance_band(uuid) from anon;
revoke execute on function search_uk_places(text) from anon;
revoke execute on function discover_profiles(int, int, int, int, text[], text[], text[], text[], text[], text[], int, int, text, int, int) from anon;
