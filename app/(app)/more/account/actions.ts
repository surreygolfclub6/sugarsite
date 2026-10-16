"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountState = { error?: string; notice?: string };

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");
  return { supabase, user, email: user.email };
}

// Re-checking the password stops someone at an unattended screen from changing it or deleting the account.
async function passwordIsRight(supabase: Awaited<ReturnType<typeof createClient>>, email: string, password: unknown) {
  if (typeof password !== "string" || !password) return false;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function changePassword(_: AccountState, formData: FormData): Promise<AccountState> {
  const { supabase, email } = await signedIn();
  const next = z.string().min(10, "Use at least 10 characters for your new password.").safeParse(formData.get("password"));
  if (!next.success) return { error: next.error.issues[0].message };
  if (formData.get("confirm") !== next.data) return { error: "The two new passwords don’t match." };
  if (!(await passwordIsRight(supabase, email, formData.get("current")))) return { error: "Your current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: next.data });
  if (error) return { error: error.message };
  return { notice: "Your password has been changed." };
}

export async function deleteAccount(_: AccountState, formData: FormData): Promise<AccountState> {
  const { supabase, user, email } = await signedIn();
  if (formData.get("confirm") !== "yes") return { error: "Tick the box to confirm you want to delete your account." };
  if (!(await passwordIsRight(supabase, email, formData.get("password")))) return { error: "Your password is incorrect." };

  // Deleting the user removes the profile and, through cascading deletes, photos, likes, blocks,
  // conversations and messages. The photo files in storage are separate, so clear those too.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "We couldn’t delete your account. Please try again or contact support." };

  const { data: files } = await admin.storage.from("photos").list(user.id, { limit: 100 });
  if (files?.length) await admin.storage.from("photos").remove(files.map((f) => `${user.id}/${f.name}`));

  await supabase.auth.signOut({ scope: "local" });
  redirect("/goodbye");
}
