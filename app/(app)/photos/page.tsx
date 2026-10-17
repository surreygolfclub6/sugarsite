import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupPath } from "@/lib/member-status";
import { PhotoStep } from "@/app/onboarding/photo-step";
import { PrivateSharing } from "./private-sharing";

export const metadata: Metadata = { title: "Your photos" };

async function PhotosContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  const setup = setupPath(me?.status);
  if (!me || setup) redirect(setup ?? "/onboarding");

  const { data: rows } = await supabase
    .from("photos")
    .select("id, storage_path, moderation, rejection_reason, visibility")
    .eq("user_id", user.id)
    .order("position");
  const { data: signed } = await supabase.storage
    .from("photos")
    .createSignedUrls((rows ?? []).map((r) => r.storage_path), 3600);
  const photos = (rows ?? []).flatMap((r, i) =>
    signed?.[i]?.signedUrl
      ? [{ id: r.id, path: r.storage_path, url: signed[i].signedUrl, moderation: r.moderation, reason: r.rejection_reason, visibility: r.visibility }]
      : [],
  );

  // The sharing list only matters once there is something private to share.
  const hasPrivate = (rows ?? []).some((r) => r.visibility === "private");
  let people: { id: string; name: string }[] = [];
  let shared: string[] = [];
  if (hasPrivate) {
    const [{ data: conversations }, { data: myLikes }, { data: shares }] = await Promise.all([
      supabase.from("conversations").select("user_a, user_b").or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
      supabase.from("likes").select("to_user").eq("from_user", user.id),
      supabase.from("photo_shares").select("viewer_id").eq("owner_id", user.id),
    ]);
    const liked = (myLikes ?? []).map((l) => l.to_user);
    const { data: back } = liked.length ? await supabase.from("likes").select("from_user").eq("to_user", user.id).in("from_user", liked) : { data: [] };
    shared = (shares ?? []).map((s) => s.viewer_id);
    const ids = [...new Set([...(conversations ?? []).map((c) => (c.user_a === user.id ? c.user_b : c.user_a)), ...(back ?? []).map((b) => b.from_user), ...shared])];
    const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
    people = (profiles ?? []).map((p) => ({ id: p.id, name: p.display_name ?? "Member" })).sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="max-w-xl">
      <h1 className="display px-1 text-4xl">Your photos</h1>
      <div className="mt-6">
        <PhotoStep userId={user.id} initial={photos} />
      </div>
      {hasPrivate && (
        <div className="mt-8">
          <PrivateSharing meId={user.id} people={people} shared={shared} />
        </div>
      )}
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
