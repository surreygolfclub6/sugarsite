"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { REJECTION_REASONS } from "@/lib/photo-review";

const uuid = z.string().uuid();

export async function approvePhotos(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const profileId = uuid.parse(formData.get("profile_id"));
  await admin
    .from("photos")
    .update({ moderation: "approved", rejection_reason: null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("user_id", profileId)
    .eq("moderation", "pending");
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
  revalidatePath("/admin");
}

export async function suspendProfile(formData: FormData) {
  const { admin } = await requireAdmin();
  const profileId = uuid.parse(formData.get("profile_id"));
  await admin.from("profiles").update({ status: "suspended" }).eq("id", profileId);
  revalidatePath("/admin");
}

export async function resolveReport(formData: FormData) {
  const { admin } = await requireAdmin();
  const reportId = uuid.parse(formData.get("report_id"));
  const outcome = z.enum(["dismissed", "actioned", "suspend"]).parse(formData.get("outcome"));

  const { data: report } = await admin.from("reports").select("reported").eq("id", reportId).eq("status", "open").single();
  if (!report) return;

  if (outcome === "suspend") await admin.from("profiles").update({ status: "suspended" }).eq("id", report.reported);
  await admin
    .from("reports")
    .update({ status: outcome === "dismissed" ? "dismissed" : "actioned" })
    .eq("id", reportId);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}
