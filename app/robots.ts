import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Member areas are behind sign-in; keeping them out of search results means nothing is indexed by accident.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/privacy", "/terms", "/safety"], disallow: ["/admin", "/api", "/auth", "/discover", "/messages", "/profile", "/more", "/interests", "/photos", "/onboarding", "/reset-password"] }],
    host: SITE_URL,
  };
}
