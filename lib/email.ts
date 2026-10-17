import "server-only";

// Sends an email through Resend's API. Needs RESEND_API_KEY (the same Resend account the sign-in emails use). Without it,
// nothing is sent and the caller is told, so notifications simply do nothing in an environment that isn't set up.
const FROM = process.env.EMAIL_FROM ?? "SugarMatch <notifications@mail.sugarmatch.site>";

export type Email = { to: string; subject: string; text: string; html: string; headers?: Record<string, string>; replyTo?: string };

export async function sendEmail(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY is not set, so no email was sent");
    return false;
  }
  try {
    const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email.to], subject: email.subject, text: email.text, html: email.html, headers: email.headers, reply_to: email.replyTo }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("Email send failed", res.status);
    return res.ok;
  } catch (error) {
    console.error("Email send failed", error instanceof Error ? error.name : "error");
    return false;
  }
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
