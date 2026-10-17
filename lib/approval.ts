import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// During the testing phase a new member waits for a moderator to approve them. This is a database flag, not code,
// so it can be switched off at launch (update app_flags set value = false where key = 'require_approval').
export async function approvalRequired(): Promise<boolean> {
  const { data } = await createAdminClient().from("app_flags").select("value").eq("key", "require_approval").maybeSingle();
  return data?.value === true;
}
