// The sign-in session cookie. The browser client has to read it (live messages and photo uploads talk to
// Supabase directly), so it can't be HttpOnly; instead it's Secure in production, SameSite=Lax, and lasts
// 30 days rather than the library's 400.
export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};
