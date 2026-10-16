import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
