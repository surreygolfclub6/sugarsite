import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description:
    "A dating site for adults who prefer to say what they're looking for up front. Verified members, private messaging, real moderation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
