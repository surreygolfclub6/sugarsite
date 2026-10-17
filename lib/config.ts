// One place to rename the product and tune launch rules.
export const SITE_NAME = "SugarMatch";
export const SITE_TAGLINE = "Relationships on clear terms";
export const MIN_AGE = 18;

// Launch mode: everything free. Flip PAYWALL_ENABLED in the database
// (app_flags table) when you add subscriptions, not here.
export const FREE_NEW_CONVERSATIONS_PER_DAY = 5;

// Where emails and redirects point. Set NEXT_PUBLIC_SITE_URL in each environment.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Legal pages. Fill in the placeholders and set LEGAL_DRAFT to false once a solicitor has reviewed the text.
export const LEGAL_DRAFT = true;
export const LEGAL_UPDATED = "17 October 2026";
// Bump when the Terms or Privacy Policy change in a way members must agree to again.
export const CONSENT_VERSION = "2026-10-17";
export const COMPANY = {
  name: "[Company name]",
  address: "[Registered address]",
  email: "support@mail.sugarmatch.site",
  privacyEmail: "support@mail.sugarmatch.site",
};
