import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Marks a member as recently active, at most once every few minutes. Members can't write
// this column themselves, so "recently active" and the online dot can't be faked.
export async function touchActive(userId: string) {
  const stale = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await createAdminClient()
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId)
    .or(`last_active_at.is.null,last_active_at.lt.${stale}`);
}
