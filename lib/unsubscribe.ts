import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// A signed token for "stop emailing me", so the link in an email works without signing in and can't be guessed or reused
// for anyone else. It is derived from the server's secret key, which never leaves the server.
const sign = (userId: string) => createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").update(`unsubscribe:${userId}`).digest("base64url");

export const unsubscribeToken = sign;

export function validUnsubscribe(userId: string, token: string) {
  const a = Buffer.from(sign(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
