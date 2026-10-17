"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { REJECTION_REASONS } from "@/lib/photo-review";
import { DECLINE_REASONS } from "@/lib/decline-reasons";

const uuid = z.string().uuid();

type Admin = Awaited<ReturnType<typeof requireAdmin>>["admin"];

// Every moderator action leaves a record: who did what to whom. A failed write is logged but never blocks the action.
async function record(admin: Admin, adminId: string, action: string, target: string | null, detail?: Record<string, unknown>) {
  const { error } = await admin.from("moderation_log").insert({ admin_id: adminId, action, target_user: target, detail: detail ?? null });
  if (error) console.error("Moderation log write failed", error.code);
}

export async function approvePhotos(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const profileId = uuid.parse(formData.get("profile_id"));
  await admin
    .from("photos")
    .update({ moderation: "approved", rejection_reason: null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("user_id", profileId)
    .eq("moderation", "pending");
  await record(admin, user.id, "photos_approved", profileId);
  revalidatePath("/admin");
}

export async function rejectPhoto(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const photoId = uuid.parse(formData.get("photo_id"));
  const reason = z.enum(REJECTION_REASONS.map((r) => r.value) as [string, ...string[]]).parse(formData.get("reason"));
  await admin
    .from("photos")
    .update({ moderation: "rejected", rejection_reason: reason, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", photoId)
    .eq("moderation", "pending");
  await record(admin, user.id, "photo_rejected", null, { photo_id: photoId, reason });
  revalidatePath("/admin");
}

export async function suspendProfile(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const profileId = uuid.parse(formData.get("profile_id"));
  await admin.from("profiles").update({ status: "suspended" }).eq("id", profileId);
  await record(admin, user.id, "profile_suspended", profileId, { from: "photo review" });
  revalidatePath("/admin");
}

export async function resolveReport(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const reportId = uuid.parse(formData.get("report_id"));
  const outcome = z.enum(["dismissed", "actioned", "suspend"]).parse(formData.get("outcome"));

  const { data: report } = await admin.from("reports").select("reported").eq("id", reportId).eq("status", "open").single();
  if (!report) return;

  if (outcome === "suspend") await admin.from("profiles").update({ status: "suspended" }).eq("id", report.reported);
  await admin
    .from("reports")
    .update({ status: outcome === "dismissed" ? "dismissed" : "actioned" })
    .eq("id", reportId);
  await record(admin, user.id, `report_${outcome}`, report.reported, { report_id: reportId });
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

// ---- Account approval (testing phase) ----


// Approving a member makes their profile live. Their photos are on this page for the decision, so any that are
// still waiting are approved with it.
export async function approveMember(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const profileId = uuid.parse(formData.get("profile_id"));
  const { data: updated } = await admin
    .from("profiles")
    .update({ status: "active" })
    .eq("id", profileId)
    .eq("status", "awaiting_approval")
    .select("id");
  if (!updated?.length) return;
  await admin
    .from("photos")
    .update({ moderation: "approved", rejection_reason: null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("user_id", profileId)
    .eq("moderation", "pending");
  await record(admin, user.id, "member_approved", profileId);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}

export async function declineMember(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const profileId = uuid.parse(formData.get("profile_id"));
  const reason = z.enum(DECLINE_REASONS.map((r) => r.value) as [string, ...string[]]).parse(formData.get("reason"));
  const { data: updated } = await admin
    .from("profiles")
    .update({ status: "declined" })
    .eq("id", profileId)
    .eq("status", "awaiting_approval")
    .select("id");
  if (!updated?.length) return;
  await record(admin, user.id, "member_declined", profileId, { reason });
  revalidatePath("/admin/approvals");
}

// Marks a member as a tester (Champion limits, whatever their record) or removes it again.
export async function setTester(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const profileId = uuid.parse(formData.get("profile_id"));
  const on = formData.get("tester") === "on";
  const back = String(formData.get("back") ?? "");
  await admin.from("profiles").update({ is_tester: on }).eq("id", profileId);
  await record(admin, user.id, on ? "tester_on" : "tester_off", profileId);
  revalidatePath("/admin/members");
  redirect(back.startsWith("/admin/members") ? back : "/admin/members");
}
