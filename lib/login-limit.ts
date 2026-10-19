import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Slows down password guessing. After a few wrong tries the wait doubles each time, per account and per IP (see the
// login_wait_seconds function). Only hashes are stored.
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

async function keys(email: string) {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return { email: hash(email), ip: hash(ip) };
}

export async function loginWaitSeconds(email: string): Promise<number> {
  const k = await keys(email);
  const { data } = await createAdminClient().rpc("login_wait_seconds", { p_email: k.email, p_ip: k.ip });
  return typeof data === "number" ? data : 0;
}

export async function recordLoginFailure(email: string) {
  const k = await keys(email);
  await createAdminClient().rpc("record_login_failure", { p_email: k.email, p_ip: k.ip });
}

export async function clearLoginFailures(email: string) {
  const k = await keys(email);
  await createAdminClient().rpc("clear_login_failures", { p_email: k.email });
}

export function waitMessage(seconds: number) {
  const text = seconds >= 90 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} seconds`;
  return `Too many attempts. Please wait ${text} and try again, or reset your password.`;
}
