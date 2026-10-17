"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminSecurityState, requireAdmin, requireAdminAccount } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type MfaState = { error?: string };
export type Enrollment = { factorId: string; qr: string; secret: string } | { error: string };

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;

async function record(adminId: string, action: string, detail?: Record<string, unknown>) {
  await createAdminClient().from("moderation_log").insert({ admin_id: adminId, action, target_user: adminId, detail: detail ?? null });
}

async function tooManyFailures(adminId: string) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await createAdminClient()
    .from("moderation_log")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", adminId)
    .eq("action", "admin_mfa_failed")
    .gte("created_at", since);
  return (count ?? 0) >= MAX_FAILURES;
}

// Starts adding an authenticator app. An admin who already has one has to have passed it recently first,
// so a hijacked password session can't quietly add its own device.
export async function startEnrollment(): Promise<Enrollment> {
  const { supabase, user } = await requireAdminAccount();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = (factors?.all ?? []).filter((f) => f.factor_type === "totp");
  if (totp.some((f) => f.status === "verified") && !(await adminSecurityState()).fresh) {
    return { error: "Enter your current authenticator code first." };
  }
  // Half-finished set-ups from earlier attempts are cleared out.
  for (const f of totp.filter((f) => f.status === "unverified")) await supabase.auth.mfa.unenroll({ factorId: f.id });

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "SugarMatch",
    // Names have to be unique per account, so two devices added in the same minute don't collide.
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16).replace("T", " ")} ${crypto.randomUUID().slice(0, 4)}`,
  });
  if (error || !data) return { error: "We couldn’t start the set-up. Please try again." };
  await record(user.id, "admin_mfa_enrol_started");
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyCode(_: MfaState, formData: FormData): Promise<MfaState> {
  const { supabase, user } = await requireAdminAccount();
  const parsed = z.object({ factorId: z.string().uuid(), code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your app.") }).safeParse({
    factorId: formData.get("factorId"),
    code: String(formData.get("code") ?? "").replace(/\s/g, ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await tooManyFailures(user.id)) return { error: `Too many wrong codes. Wait ${WINDOW_MINUTES} minutes and try again.` };

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: parsed.data.factorId });
  if (challengeError || !challenge) return { error: "We couldn’t check that code. Please try again." };
  const { error } = await supabase.auth.mfa.verify({ factorId: parsed.data.factorId, challengeId: challenge.id, code: parsed.data.code });
  if (error) {
    await record(user.id, "admin_mfa_failed");
    return { error: "That code didn’t work. Check the time on your phone and try the newest code." };
  }
  await record(user.id, "admin_mfa_verified");
  redirect("/admin");
}

export async function removeFactor(formData: FormData) {
  const { user } = await requireAdmin();
  const factorId = z.string().uuid().parse(formData.get("factor_id"));
  const supabase = (await requireAdminAccount()).supabase;
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.all ?? []).filter((f) => f.factor_type === "totp" && f.status === "verified");
  // Never remove the last one: that would lock the admin out of their own account.
  if (verified.length <= 1 || !verified.some((f) => f.id === factorId)) return;
  await supabase.auth.mfa.unenroll({ factorId });
  await record(user.id, "admin_mfa_removed", { factor_id: factorId });
  revalidatePath("/admin/mfa");
}
