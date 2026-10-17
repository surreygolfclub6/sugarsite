"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION, SITE_URL } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAPTCHA_MESSAGE, captchaToken, isCaptchaError } from "@/lib/captcha";
import { safeLocalPath } from "@/lib/safe-path";

export type AuthState = { error?: string; notice?: string };

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters for your password."),
});

function safeNext(value: FormDataEntryValue | null) {
  // Only same-site paths, to avoid open redirects.
  return safeLocalPath(value, "/discover");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  if (formData.get("adult") !== "on") {
    return { error: "Confirm that you’re 18 or over to continue." };
  }
  // Separate from agreeing to the terms: details like who you're looking for and your ethnicity are
  // special category data, which needs explicit consent.
  if (formData.get("consent") !== "on") {
    return { error: "Please agree to how we use the sensitive details you add to your profile." };
  }
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/onboarding`,
      captchaToken: captchaToken(formData),
    },
  });

  if (isCaptchaError(error)) return { error: CAPTCHA_MESSAGE };
  if (error) return { error: error.message };

  // Keep a record of what they agreed to, and when. Members can't write these columns themselves.
  if (data.user) {
    await createAdminClient()
      .from("profiles")
      .update({ consented_at: new Date().toISOString(), consent_version: CONSENT_VERSION })
      .eq("id", data.user.id);
  }

  // If they arrived through a member's invite link, record who invited them. This never blocks signing up, and the
  // database ignores unknown codes, codes from members who aren't live, and self-invites.
  const jar = await cookies();
  const ref = jar.get("ref")?.value;
  if (data.user && ref) {
    await createAdminClient().rpc("record_referral", { referred: data.user.id, code: ref });
    jar.delete("ref");
  }

  // With email confirmation on, there's no session yet. Remember the address (in a cookie, not the URL)
  // so the "check your email" page can show it and offer to resend.
  if (!data.session) {
    (await cookies()).set("signup_email", parsed.data.email, { maxAge: 3600, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    redirect("/check-email");
  }
  redirect("/onboarding");
}

export async function resendConfirmation(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = (await cookies()).get("signup_email")?.value;
  if (!email) redirect("/signup");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=/onboarding`, captchaToken: captchaToken(formData) },
  });
  if (isCaptchaError(error)) return { error: CAPTCHA_MESSAGE };
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return { error: "Too many requests. Please wait a few minutes before asking for another email." };
  }
  return { notice: "We’ve sent another email. It can take a few minutes to arrive." };
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().email("Enter a valid email address."),
      password: z.string().min(1, "Enter your password."),
    })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ ...parsed.data, options: { captchaToken: captchaToken(formData) } });
  if (isCaptchaError(error)) return { error: CAPTCHA_MESSAGE };
  if (error) return { error: "Email or password is incorrect." };

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Always answers the same way, so nobody can use the form to find out who has an account.
export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.string().trim().toLowerCase().email("Enter a valid email address.").safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
    captchaToken: captchaToken(formData),
  });
  if (isCaptchaError(error)) return { error: CAPTCHA_MESSAGE };
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return { error: "Too many requests. Please wait a few minutes and try again." };
  }
  // If Supabase ignores redirectTo and sends the link to the site root, the callback uses this to tell a
  // reset link from a sign-up link. The PKCE code only works in this browser anyway, so the cookie does too.
  (await cookies()).set("pw_reset", "1", { maxAge: 3600, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return { notice: "If there’s an account for that email, we’ve sent a link to reset the password. It can take a few minutes." };
}

const newPassword = z.string().min(10, "Use at least 10 characters for your password.");

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = newPassword.safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (formData.get("confirm") !== password.data) return { error: "The two passwords don’t match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "This link has expired. Ask for a new one." };

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: error.message };
  // Anyone else signed in to this account, on another device, is signed out.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/discover");
}
