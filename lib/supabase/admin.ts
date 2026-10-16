import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses row-level security, so it must only be used
// in server code for things members can't do themselves (changing profile
// status, creating signed photo URLs, admin moderation).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
