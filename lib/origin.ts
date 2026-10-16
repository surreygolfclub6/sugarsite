import { SITE_URL } from "@/lib/config";

// The address the visitor actually used. Behind a proxy or when bound to 0.0.0.0, `request.url` can name
// the server's own address instead, which would send the browser to a host that has none of its cookies.
// Only the configured site and localhost are trusted; anything else falls back to the configured site.
export function requestOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return SITE_URL;

  const hostname = host.replace(/:\d+$/, "");
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const isSite = host === new URL(SITE_URL).host;
  if (!isLocal && !isSite) return SITE_URL;

  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0] ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
