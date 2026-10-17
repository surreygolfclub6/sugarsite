import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_NAME, SITE_URL, COMPANY } from "@/lib/config";
import { escapeHtml, sendEmail } from "@/lib/email";
import { unsubscribeToken } from "@/lib/unsubscribe";

const QUIET_FOR_MS = 60 * 60 * 1000; // at most one email an hour per conversation
const ONLINE_MS = 5 * 60 * 1000; // no email if they were on the site in the last 5 minutes

// Emails the recipient when someone messages them. It never includes what was written, only who wrote, and it respects
// the member's setting, their status, whether they are online right now, and a one-an-hour limit per conversation.
export async function notifyNewMessage(conversationId: string, senderId: string) {
  const admin = createAdminClient();
  const { data: conversation } = await admin.from("conversations").select("user_a, user_b").eq("id", conversationId).maybeSingle();
  if (!conversation) return;
  const recipientId = conversation.user_a === senderId ? conversation.user_b : conversation.user_a;
  const [{ data: recipient }, { data: sender }] = await Promise.all([
    admin.from("profiles").select("display_name, status, email_notifications, last_active_at").eq("id", recipientId).maybeSingle(),
    admin.from("profiles").select("display_name").eq("id", senderId).maybeSingle(),
  ]);
  if (!recipient || !sender || recipient.status !== "active" || !recipient.email_notifications) return;
  if (recipient.last_active_at && Date.now() - Date.parse(recipient.last_active_at) < ONLINE_MS) return;

  const { data: log } = await admin.from("notification_log").select("last_sent_at").eq("conversation_id", conversationId).eq("recipient_id", recipientId).maybeSingle();
  if (log && Date.now() - Date.parse(log.last_sent_at) < QUIET_FOR_MS) return;

  const { data: user } = await admin.auth.admin.getUserById(recipientId);
  const to = user.user?.email;
  if (!to) return;

  // Record first, so two messages arriving together can't both send.
  await admin.from("notification_log").upsert({ conversation_id: conversationId, recipient_id: recipientId, last_sent_at: new Date().toISOString() });

  const from = sender.display_name ?? "A member";
  const name = recipient.display_name ?? "there";
  const open = `${SITE_URL}/messages/${conversationId}`;
  const token = unsubscribeToken(recipientId);
  const stop = `${SITE_URL}/unsubscribe?u=${recipientId}&t=${token}`;
  const oneClick = `${SITE_URL}/unsubscribe/one-click?u=${recipientId}&t=${token}`;

  const sent = await sendEmail({
    to,
    subject: `${from} sent you a message on ${SITE_NAME}`,
    replyTo: COMPANY.email,
    headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    text: `Hi ${name},\n\n${from} sent you a message on ${SITE_NAME}.\n\nRead it and reply: ${open}\n\nYou're getting this because you have a ${SITE_NAME} account. To stop these emails: ${stop}\n`,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2a1f2d">
  <p style="font-size:16px">Hi ${escapeHtml(name)},</p>
  <p style="font-size:16px"><strong>${escapeHtml(from)}</strong> sent you a message on ${escapeHtml(SITE_NAME)}.</p>
  <p style="margin:28px 0"><a href="${open}" style="background:#b8405e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px">Read and reply</a></p>
  <p style="font-size:12px;color:#6b5d70">You’re getting this because you have a ${escapeHtml(SITE_NAME)} account. <a href="${stop}" style="color:#6b5d70">Stop these emails</a>.</p>
</div>`,
  });
  // If it didn't go, let the next message try again.
  if (!sent) await admin.from("notification_log").delete().eq("conversation_id", conversationId).eq("recipient_id", recipientId);
}
