// Where to send someone after sign-in or an email link. Only a plain path on this site is allowed.
// A leading "//" or a backslash ("/\\evil.com") is read by browsers as another host, so both are refused,
// along with control characters and anything that doesn't resolve to this site.
export function safeLocalPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 300) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://same-site.invalid");
    return url.origin === "https://same-site.invalid" ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}
