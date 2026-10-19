import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Only the public pages. Everything else is behind sign-in.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/how-it-works", "/faq", "/levels", "/safety", "/terms", "/privacy"].map((path) => ({ url: `${SITE_URL}${path}` }));
}
