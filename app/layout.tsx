import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/config";

const DESCRIPTION =
  "SugarMatch is an adults-only UK dating site for people who’d rather be direct about the relationship they want. Age-verified members, every photo checked by a person, private messaging, and free to use.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: honest dating for adults, on clear terms`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GB", title: `${SITE_NAME}: honest dating for adults, on clear terms`, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: honest dating for adults, on clear terms`, description: DESCRIPTION },
};

// Tells search engines what the site is, so results can show the name and logo properly.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: "en-GB" },
    { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint. Light is the default. */}
        <script src="/theme.js" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
