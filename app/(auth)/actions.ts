"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION, SITE_URL } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthState = { error?: string; notice?: string };

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters for your password."),
});

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  // Only allow same-site paths to avoid open redirects.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/discover";
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
    },
  });

  if (error) return { error: error.message };

  // Keep a record of what they agreed to, and when. Members can't write these columns themselves.
  if (data.user) {
    await createAdminClient()
      .from("profiles")
      .update({ consented_at: new Date().toISOString(), consent_version: CONSENT_VERSION })
      .eq("id", data.user.id);
  }

  // With email confirmation on, there's no session yet.
  if (!data.session) {
    return { notice: "Check your inbox for a confirmation link to finish signing up." };
  }
  redirect("/onboarding");
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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
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
  });
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return { error: "Too many requests. Please wait a few minutes and try again." };
  }
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
  redirect("/discover");
}
