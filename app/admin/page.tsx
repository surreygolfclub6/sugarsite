import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { REJECTION_REASONS } from "@/lib/photo-review";
import { SITE_NAME } from "@/lib/config";
import { AdminNav } from "./admin-nav";
import { approvePhotos, rejectPhoto, suspendProfile } from "./actions";

export const metadata: Metadata = { title: "Photo review" };

function ageFrom(birthdate: string | null) {
  if (!birthdate) return null;
  const dob = new Date(`${birthdate}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  if (now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

async function Queue() {
  await connection();
  const { admin } = await requireAdmin();

  const { data: pending } = await admin
    .from("photos")
    .select("id, user_id, storage_path, created_at, visibility")
    .eq("moderation", "pending")
    .order("created_at");

  const userIds = [...new Set((pending ?? []).map((p) => p.user_id))];
  const { data: profiles } = userIds.length
    ? await admin
        .from("profiles")
        .select("id, display_name, birthdate, gender, city, headline, bio, looking_for, status")
        .in("id", userIds)
        .neq("status", "suspended")
    : { data: [] };

  const photos = (pending ?? []).filter((p) => profiles?.some((u) => u.id === p.user_id));
  const { data: signed } = photos.length
    ? await admin.storage.from("photos").createSignedUrls(photos.map((p) => p.storage_path), 600)
    : { data: [] };
  const urlFor = (path: string) => signed?.find((s) => s.path === path)?.signedUrl ?? undefined;

  // Oldest waiting profile first.
  const queue = userIds
    .map((id) => profiles?.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <p className="display text-2xl lg:hidden">{SITE_NAME}</p>
      <Suspense fallback={null}>
        <AdminNav current="photos" />
      </Suspense>
      <h1 className="display mt-8 text-4xl">Photo review</h1>
      <p className="mt-3 text-dusk">
        {queue.length === 0
          ? "Nothing waiting. New photos appear here as members upload them."
          : `${queue.length} ${queue.length === 1 ? "profile" : "profiles"} waiting, oldest first.`}
      </p>

      <ul className="mt-8 space-y-8">
        {queue.map((u) => (
          <li key={u.id} data-profile={u.id} className="rounded-2xl border border-line p-5">
            <h2 className="display text-2xl">
              {u.display_name}, {ageFrom(u.birthdate)}
            </h2>
            <p className="mt-1 text-sm text-dusk">
              {u.gender} · {u.city}
            </p>
            {u.headline && <p className="mt-3 font-medium">{u.headline}</p>}
            <p className="mt-2 whitespace-pre-line text-sm">{u.bio}</p>
            {u.looking_for && <p className="mt-2 whitespace-pre-line text-sm text-dusk">{u.looking_for}</p>}

            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {photos
                .filter((p) => p.user_id === u.id)
                .map((p) => (
                  <li key={p.id} className="space-y-2">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={urlFor(p.storage_path)} alt={`Pending ${p.visibility} photo`} className="aspect-[3/4] w-full rounded-xl border border-line object-cover" />
                      <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">{p.visibility === "private" ? "Private" : "Public"}</span>
                    </div>
                    <form action={rejectPhoto} className="flex gap-2">
                      <input type="hidden" name="photo_id" value={p.id} />
                      <select name="reason" aria-label="Rejection reason" defaultValue="other" className="field !py-2 text-sm">
                        {REJECTION_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-quiet !py-2 text-sm">Reject</button>
                    </form>
                  </li>
                ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <form action={approvePhotos}>
                <input type="hidden" name="profile_id" value={u.id} />
                <button className="btn btn-primary">Approve all photos</button>
              </form>
              <form action={suspendProfile}>
                <input type="hidden" name="profile_id" value={u.id} />
                <button className="btn btn-quiet text-danger">Suspend profile</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-4xl px-5 py-8" aria-busy="true" />}>
      <Queue />
    </Suspense>
  );
}
