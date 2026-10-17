import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { SITE_NAME } from "@/lib/config";
import { DECLINE_REASONS } from "@/lib/decline-reasons";
import { ageFrom } from "@/lib/people";
import { AdminNav } from "../admin-nav";
import { approveMember, declineMember } from "../actions";

export const metadata: Metadata = { title: "Approvals" };

async function Approvals() {
  await connection();
  const { admin } = await requireAdmin();

  const { data: members } = await admin
    .from("profiles")
    .select("id, display_name, birthdate, gender, seeking, city, headline, bio, looking_for, relationship_goals, created_at, age_verified")
    .eq("status", "awaiting_approval")
    .order("created_at");
  const ids = (members ?? []).map((m) => m.id);

  const [{ data: checks }, { data: photos }] = ids.length
    ? await Promise.all([
        admin.from("age_checks").select("user_id, assurance_level, age_threshold, country, verified_at").in("user_id", ids),
        admin.from("photos").select("id, user_id, storage_path, moderation").in("user_id", ids).order("position"),
      ])
    : [{ data: [] }, { data: [] }];
  const { data: signed } = photos?.length
    ? await admin.storage.from("photos").createSignedUrls(photos.map((p) => p.storage_path), 600)
    : { data: [] };
  const urlFor = (path: string) => signed?.find((s) => s.path === path)?.signedUrl ?? undefined;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <Link href="/discover" className="display text-2xl">{SITE_NAME}</Link>
      <Suspense fallback={null}>
        <AdminNav current="approvals" />
      </Suspense>
      <h1 className="display mt-8 text-4xl">Approvals</h1>
      <p className="mt-3 text-dusk">
        {(members ?? []).length === 0
          ? "Nobody is waiting. New members appear here after they finish their profile and pass the age check."
          : `${members?.length} ${members?.length === 1 ? "member" : "members"} waiting, oldest first. Approving makes the profile and its photos live.`}
      </p>

      <ul className="mt-8 space-y-8">
        {(members ?? []).map((m) => {
          const check = checks?.find((c) => c.user_id === m.id);
          const mine = (photos ?? []).filter((p) => p.user_id === m.id);
          return (
            <li key={m.id} data-member={m.id} className="rounded-2xl border border-line p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="display text-2xl">{m.display_name}{m.birthdate && `, ${ageFrom(m.birthdate)}`}</h2>
                <p className="text-xs text-dusk">Joined {new Date(m.created_at).toLocaleDateString("en-GB")}</p>
              </div>
              <p className="mt-1 text-sm text-dusk">{m.gender} seeking {(m.seeking ?? []).join(", ")} · {m.city}</p>
              <p className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs ${check ? "border-brass text-brass" : "border-danger text-danger"}`}>
                {check
                  ? `Age verified · level ${check.assurance_level ?? "?"} · over ${check.age_threshold} · ${check.country ?? "?"}`
                  : "No age check on record"}
              </p>
              {m.headline && <p className="mt-4 font-medium">{m.headline}</p>}
              {m.bio && <p className="mt-2 whitespace-pre-line text-sm">{m.bio}</p>}
              {m.looking_for && <p className="mt-2 whitespace-pre-line text-sm text-dusk">{m.looking_for}</p>}
              {(m.relationship_goals ?? []).length > 0 && <p className="mt-2 text-sm text-dusk">Looking for: {m.relationship_goals.join(", ")}</p>}

              <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {mine.map((p) => (
                  <li key={p.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urlFor(p.storage_path)} alt={`${m.display_name}’s photo (${p.moderation})`} className="aspect-[3/4] w-full rounded-xl border border-line object-cover" />
                  </li>
                ))}
                {mine.length === 0 && <li className="text-sm text-dusk">No photos.</li>}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <form action={approveMember}>
                  <input type="hidden" name="profile_id" value={m.id} />
                  <button className="btn btn-primary">Approve member and photos</button>
                </form>
                <form action={declineMember} className="flex items-center gap-2">
                  <input type="hidden" name="profile_id" value={m.id} />
                  <select name="reason" aria-label="Reason for declining" defaultValue="other" className="field !py-2 text-sm">
                    {DECLINE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button className="btn btn-quiet text-danger">Decline</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-4xl px-5 py-8" aria-busy="true" />}>
      <Approvals />
    </Suspense>
  );
}
