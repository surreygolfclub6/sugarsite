import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANY, SITE_NAME, SITE_URL } from "@/lib/config";
import { escapeHtml, sendEmail } from "@/lib/email";
import { LEVELS, perDayText } from "@/lib/levels";

// Sent once, when a member's profile first goes live. It says they're in and how things work, and nothing else.
export async function sendWelcome(memberId: string) {
  const admin = createAdminClient();
  // Claim it first, so two approvals arriving together can't both send.
  const { data: claimed } = await admin
    .from("profiles")
    .update({ welcomed_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("status", "active")
    .is("welcomed_at", null)
    .select("display_name, referral_code")
    .maybeSingle();
  if (!claimed) return;

  const { data: user } = await admin.auth.admin.getUserById(memberId);
  const to = user.user?.email;
  const release = () => admin.from("profiles").update({ welcomed_at: null }).eq("id", memberId);
  if (!to) return void (await release());

  const name = claimed.display_name ?? "there";
  const [newcomer, member] = [LEVELS[0], LEVELS[1]];
  const invite = `${SITE_URL}/join?ref=${claimed.referral_code}`;
  const points = [
    ["Find people", "Search by age, distance and what people are looking for, and save searches you use often. We only ever show a rounded distance, never an exact location."],
    ["Say hello", "Like profiles to show interest. If they like you back it’s a match, and you can message each other freely. Replying to anyone who writes to you is always unlimited."],
    ["Your first week", `Your first week counts as ${member.label}, so you can start ${perDayText(member.conversationsPerDay)}. After that you start at ${newcomer.label} (${perDayText(newcomer.conversationsPerDay)}) and move up by completing your profile, having conversations and inviting friends.`],
    ["Invite friends", `A friend counts once they’re a real member. 1 friend takes you to Member (${member.conversationsPerDay} new conversations a day), 3 to Trusted (${LEVELS[2].conversationsPerDay}) and 10 to Champion (${LEVELS[3].conversationsPerDay}).`],
    ["Private photos", "Keep any photo private and share it only with people you choose, from the menu in a chat."],
    ["Stay in control", "You can block or report anyone from the menu on a profile or in a chat. Blocking is silent."],
  ];

  const sent = await sendEmail({
    to,
    subject: `You’re in, welcome to ${SITE_NAME}`,
    replyTo: COMPANY.email,
    text: `Hi ${name},\n\nYour profile has been approved and is now live on ${SITE_NAME}. Here’s how things work:\n\n${points.map(([t, b]) => `${t}\n${b}`).join("\n\n")}\n\nYour invite link: ${invite}\n\nStart browsing: ${SITE_URL}/discover\n\nIf anything is unclear, reply to this email or see ${SITE_URL}/faq.\n`,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#2a1f2d">
  <p style="font-size:18px">Hi ${escapeHtml(name)},</p>
  <p style="font-size:16px">Your profile has been approved and is now live on ${escapeHtml(SITE_NAME)}. Here’s how things work.</p>
  ${points.map(([t, b]) => `<p style="font-size:15px;margin:18px 0 0"><strong>${escapeHtml(t)}</strong><br>${escapeHtml(b)}</p>`).join("\n  ")}
  <p style="margin:28px 0"><a href="${SITE_URL}/discover" style="background:#b8405e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px">Start browsing</a></p>
  <p style="font-size:13px;color:#6b5d70">Your invite link: <a href="${invite}" style="color:#6b5d70">${invite}</a><br>Questions? Reply to this email or read the <a href="${SITE_URL}/faq" style="color:#6b5d70">FAQ</a>.</p>
</div>`,
  });
  if (!sent) await release();
}
