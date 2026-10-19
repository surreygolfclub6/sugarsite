import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { escapeHtml, sendEmail } from "@/lib/email";

// Tells the moderators when something needs them: a member waiting for approval, or a new report. They go to every address in
// the admins table (or to ADMIN_NOTIFY_EMAIL, comma separated, if that is set). Nothing private goes in the email, only
// who and where to look, because the moderator signs in (with their authenticator code) to see the rest.
async function adminEmails(): Promise<string[]> {
  const override = process.env.ADMIN_NOTIFY_EMAIL?.split(",").map((e) => e.trim()).filter(Boolean);
  if (override?.length) return override;
  const admin = createAdminClient();
  const { data: rows } = await admin.from("admins").select("user_id");
  const emails = await Promise.all((rows ?? []).map(async (r) => (await admin.auth.admin.getUserById(r.user_id)).data.user?.email));
  return emails.filter((e): e is string => !!e);
}

async function tellAdmins(subject: string, line: string, path: string, button: string) {
  const link = `${SITE_URL}${path}`;
  const to = await adminEmails();
  await Promise.all(
    to.map((address) =>
      sendEmail({
        to: address,
        subject,
        text: `${line}\n\n${button}: ${link}\n`,
        html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2a1f2d">
  <p style="font-size:16px">${escapeHtml(line)}</p>
  <p style="margin:28px 0"><a href="${link}" style="background:#b8405e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px">${escapeHtml(button)}</a></p>
  <p style="font-size:12px;color:#6b5d70">Moderator notice from ${escapeHtml(SITE_NAME)}.</p>
</div>`,
      }),
    ),
  );
}

// Call once a member's profile is complete and they have reached the point a moderator can act (or they are simply live).
export async function notifyAdminsNewMember(memberId: string) {
  const { data: p } = await createAdminClient().from("profiles").select("display_name, status").eq("id", memberId).maybeSingle();
  if (!p) return;
  const name = p.display_name ?? "A new member";
  if (p.status === "awaiting_approval") {
    await tellAdmins(`${name} is waiting for approval`, `${name} has finished their profile and is waiting for you to approve them.`, "/admin/approvals", "Review");
  } else if (p.status === "active") {
    await tellAdmins(`${name} has joined`, `${name} has joined ${SITE_NAME}.`, "/admin/members", "See members");
  }
}

export async function notifyAdminsReport(reason: string) {
  await tellAdmins("New report to review", `A member has reported someone (${reason}).`, "/admin/reports", "Review");
}
