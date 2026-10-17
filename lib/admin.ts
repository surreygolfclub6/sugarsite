import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admins sign in with a password and then prove a second factor, a code from an authenticator app. Their session
// only counts as an admin session for 8 hours after that code, and the database enforces the same rule
// (is_admin() needs an aal2 session), so a stolen password alone opens nothing.
export const MFA_MAX_AGE_MS = 8 * 60 * 60 * 1000;

// An admin account, at any assurance level. Used by the screens where the second factor is set up or entered.
// Everyone else gets a 404, not a hint that the page exists.
export async function requireAdminAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: isAdmin } = await supabase.rpc("is_admin_user", { uid: user.id });
  if (!isAdmin) notFound();
  return { supabase, user };
}

// Whether this session has recently passed the authenticator check.
export async function adminSecurityState() {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const methods = (data?.currentAuthenticationMethods ?? []) as Array<string | { method: string; timestamp: number }>;
  const totp = methods.find((m): m is { method: string; timestamp: number } => typeof m !== "string" && m.method === "totp");
  const fresh = data?.currentLevel === "aal2" && !!totp && Date.now() - totp.timestamp * 1000 < MFA_MAX_AGE_MS;
  return { fresh, level: data?.currentLevel ?? null };
}

// Every admin page and action calls this first.
export async function requireAdmin() {
  const { user } = await requireAdminAccount();
  const { fresh } = await adminSecurityState();
  if (!fresh) redirect("/admin/mfa");
  return { user, admin: createAdminClient() };
}
