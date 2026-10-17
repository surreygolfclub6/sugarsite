import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Supabase serves the photos (signed URLs) and the realtime socket; hCaptcha loads its widget from hcaptcha.com. Scripts and styles need
// 'unsafe-inline' because Next.js injects inline bootstrap code; everything else is locked to this site.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
  "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
  "frame-src https://hcaptcha.com https://*.hcaptcha.com",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://hcaptcha.com https://*.hcaptcha.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // The dev server runs over plain http and needs eval for hot reloading, so only enforce this in production.
  ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Lets a production build write elsewhere, so it can run beside the dev server.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["100.83.78.37", "home.tail3ae9bc.ts.net"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
