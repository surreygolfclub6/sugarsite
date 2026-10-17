import "server-only";
import { SITE_URL } from "@/lib/config";

// Age assurance through AgeVerif's OAuth2 flow. The member is sent to AgeVerif, comes back with a one-time
// code, and this server exchanges it and asks AgeVerif for the verdict directly, so the result never passes
// through the browser. See https://docs.ageverif.com/oauth2.html

const API = process.env.AGEVERIF_API_BASE ?? "https://api.ageverif.com";

// The lowest assurance level accepted. Confirm with AgeVerif which level counts as "highly effective"
// age assurance for UK law, and raise this if it isn't STANDARD.
const MIN_ASSURANCE: Assurance = "STANDARD";
const MIN_AGE_THRESHOLD = 18;

type Assurance = "STANDARD" | "ENHANCED" | "STRICT";
const RANK: Record<Assurance, number> = { STANDARD: 1, ENHANCED: 2, STRICT: 3 };

export type Verification = {
  verified: boolean;
  uid: string;
  country: string | null;
  assurance_level: string | null;
  age_threshold: number;
  reused: boolean | null;
  expires_at: string | number | null;
};

export type Verdict = { ok: true } | { ok: false; reason: "not_verified" | "too_young" | "low_assurance" | "expired" };

// Without credentials the check is switched off (local development), and profiles go live straight away.
export const ageCheckEnabled = () => !!(process.env.AGEVERIF_CLIENT_ID && process.env.AGEVERIF_CLIENT_SECRET);

export const ageCheckRedirectUri = () => `${SITE_URL}/age-check/callback`;

export function authorizeUrl(state: string) {
  const url = new URL("/v1/oauth2/checker", API);
  url.searchParams.set("client_id", process.env.AGEVERIF_CLIENT_ID!);
  url.searchParams.set("redirect_uri", ageCheckRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "read");
  url.searchParams.set("state", state);
  return url.toString();
}

const basicAuth = () => "Basic " + Buffer.from(`${process.env.AGEVERIF_CLIENT_ID}:${process.env.AGEVERIF_CLIENT_SECRET}`).toString("base64");

export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch(new URL("/v1/oauth2/token", API), {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: ageCheckRedirectUri() }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AgeVerif token exchange failed (${res.status})`);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("AgeVerif token response had no access_token");
  return body.access_token;
}

export async function fetchVerification(accessToken: string): Promise<Verification> {
  const url = new URL("/v1/oauth2/resources", API);
  url.searchParams.set("resources", "verification");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`AgeVerif resources request failed (${res.status})`);
  const body = (await res.json()) as { resources?: Partial<Verification> };
  const r = body.resources ?? {};
  return {
    verified: r.verified === true,
    uid: typeof r.uid === "string" ? r.uid : "",
    country: typeof r.country === "string" ? r.country : null,
    assurance_level: typeof r.assurance_level === "string" ? r.assurance_level : null,
    age_threshold: typeof r.age_threshold === "number" ? r.age_threshold : 0,
    reused: typeof r.reused === "boolean" ? r.reused : null,
    expires_at: r.expires_at ?? null,
  };
}

// AgeVerif gives expiry as a Unix timestamp in seconds; accept milliseconds or a date string too.
export function expiryDate(value: Verification["expires_at"]): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function judge(v: Verification, now = new Date()): Verdict {
  if (!v.verified || !v.uid) return { ok: false, reason: "not_verified" };
  if (v.age_threshold < MIN_AGE_THRESHOLD) return { ok: false, reason: "too_young" };
  const level = RANK[(v.assurance_level ?? "") as Assurance] ?? 0;
  if (level < RANK[MIN_ASSURANCE]) return { ok: false, reason: "low_assurance" };
  const expires = expiryDate(v.expires_at);
  if (expires && expires <= now) return { ok: false, reason: "expired" };
  return { ok: true };
}
