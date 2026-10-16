import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PhotoStep } from "@/app/onboarding/photo-step";

export const metadata: Metadata = { title: "Your photos" };

async function PhotosContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (!me || me.status === "incomplete") redirect("/onboarding");

  const { data: rows } = await supabase
    .from("photos")
    .select("id, storage_path, moderation, rejection_reason")
    .eq("user_id", user.id)
    .order("position");
  const { data: signed } = await supabase.storage
    .from("photos")
    .createSignedUrls((rows ?? []).map((r) => r.storage_path), 3600);
  const photos = (rows ?? []).flatMap((r, i) =>
    signed?.[i]?.signedUrl
      ? [{ id: r.id, path: r.storage_path, url: signed[i].signedUrl, moderation: r.moderation, reason: r.rejection_reason }]
      : [],
  );

  return (
    <div className="max-w-xl">
      <h1 className="display px-1 text-4xl">Your photos</h1>
      <div className="mt-6">
        <PhotoStep userId={user.id} initial={photos} />
      </div>
      <Link href="/more" className="btn btn-quiet mt-8">
        Back
      </Link>
    </div>
  );
}

export default function PhotosPage() {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
      <PhotosContent />
    </Suspense>
  );
}
