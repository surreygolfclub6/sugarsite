import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MIN_AGE, SITE_NAME } from "@/lib/config";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your profile" };

async function OnboardingContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (profile && profile.status !== "incomplete") redirect("/discover");

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, storage_path, moderation, rejection_reason, visibility")
    .eq("user_id", user.id)
    .order("position");
  const { data: signed } = await supabase.storage
    .from("photos")
    .createSignedUrls((photoRows ?? []).map((r) => r.storage_path), 3600);
  const initialPhotos = (photoRows ?? []).flatMap((r, i) =>
    signed?.[i]?.signedUrl ? [{ id: r.id, path: r.storage_path, url: signed[i].signedUrl, moderation: r.moderation, reason: r.rejection_reason, visibility: r.visibility }] : [],
  );

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE);
  const maxBirthdate = cutoff.toISOString().slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-10">
      <p className="display text-2xl">{SITE_NAME}</p>
      <h1 className="display mt-10 text-4xl sm:text-5xl">Tell us about you</h1>
      <p className="mt-3 text-dusk">
        This takes about two minutes. Your profile goes live straight away, and your photos appear once they’ve been checked.
      </p>
      <OnboardingForm maxBirthdate={maxBirthdate} userId={user.id} initialPhotos={initialPhotos} />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-xl px-5 py-10" aria-busy="true" />}>
      <OnboardingContent />
    </Suspense>
  );
}
