import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchActive } from "@/lib/activity";
import { ageFrom, formatHeight, lastActiveText } from "@/lib/people";
import {
  BODY_TYPES,
  ETHNICITIES,
  GENDERS,
  HAIR_COLOURS,
  RELATIONSHIP_GOALS,
  RELATIONSHIP_STATUSES,
  SEEKING,
  labelOf,
} from "@/lib/profile-options";
import { Gallery } from "./gallery";
import { SafetyMenu } from "@/components/safety-menu";
import { LikeFab, MessageBar } from "./profile-actions";

export const metadata: Metadata = { title: "Profile" };

const card = "rounded-2xl border border-line bg-velvet p-5";

function Icon({ d, children }: { d?: string; children?: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d ? <path d={d} /> : children}
    </svg>
  );
}

function Fact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      {icon}
      <span>{children}</span>
    </div>
  );
}

async function Profile({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await touchActive(user.id);

  // Row-level security hides inactive, suspended and blocked members, so they 404 like a bad link.
  const { data: p } = await supabase
    .from("profiles")
    .select(
      "id, display_name, birthdate, city, headline, bio, looking_for, gender, seeking, relationship_status, relationship_goals, height_cm, body_type, hair_colour, ethnicity, last_active_at, created_at, id_verified, photo_verified",
    )
    .eq("id", id)
    .single();
  if (!p) notFound();

  const { data: rows } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("user_id", id)
    .eq("moderation", "approved")
    .order("position");
  const paths = (rows ?? []).map((r) => r.storage_path);
  const { data: signed } = paths.length
    ? await createAdminClient().storage.from("photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const urls = paths.flatMap((path) => signed?.find((s) => s.path === path)?.signedUrl ?? []);

  const [{ data: distance }, { data: iLiked }, { data: theyLiked }] = await Promise.all([
    supabase.rpc("distance_band", { target: id }),
    supabase.from("likes").select("to_user").eq("from_user", user.id).eq("to_user", id).maybeSingle(),
    supabase.from("likes").select("from_user").eq("from_user", id).eq("to_user", user.id).maybeSingle(),
  ]);

  const name = p.display_name ?? "Member";
  const own = p.id === user.id;
  const seeking = (p.seeking as string[]).map((v) => labelOf(SEEKING, v)).filter(Boolean).join(", ");
  const details: [string, string | null][] = [
    ["I am", labelOf(GENDERS, p.gender)],
    ["Body type", labelOf(BODY_TYPES, p.body_type)],
    ["Hair colour", labelOf(HAIR_COLOURS, p.hair_colour)],
    ["Ethnicity", labelOf(ETHNICITIES, p.ethnicity)],
  ];

  return (
    <article className="space-y-3 pb-20">
      <Gallery name={name} urls={urls} menu={own ? undefined : <SafetyMenu profileId={p.id} name={name} />} />

      <div className="px-1 pt-2">
        <h1 className="display text-4xl">{name}, {ageFrom(p.birthdate)}</h1>
      </div>

      <section aria-label="At a glance" className={`${card} grid grid-cols-2 divide-line [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-line`}>
        <Fact icon={<Icon d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />}>
          {p.city}
          {typeof distance === "number" && <span className="block text-sm text-dusk">within {distance} miles</span>}
        </Fact>
        <Fact icon={<Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>}>{lastActiveText(p.last_active_at)}</Fact>
        <Fact icon={<Icon d="M4 17 17 4l3 3L7 20zM8 13l2 2m1-5 2 2" />}>{p.height_cm ? formatHeight(p.height_cm) : "Height not shared"}</Fact>
        <Fact icon={<Icon d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" />}>
          {labelOf(RELATIONSHIP_STATUSES, p.relationship_status) ?? "Not shared"}
        </Fact>
      </section>

      <section aria-labelledby="about" className={card}>
        <h2 id="about" className="display text-2xl">About</h2>
        {p.headline && <p className="mt-3 text-lg font-medium">{p.headline}</p>}
        <p className="mt-2 whitespace-pre-line">{p.bio}</p>
      </section>

      <section aria-labelledby="wants" className={card}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="wants" className="display text-2xl">I’m looking for</h2>
          <span className="text-sm text-dusk">{seeking}</span>
        </div>
        {p.looking_for && <p className="mt-3 whitespace-pre-line">{p.looking_for}</p>}
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Relationship goals">
          {(p.relationship_goals as string[]).map((g) => (
            <li key={g} className="rounded-xl border border-line px-3 py-1.5 text-sm">{labelOf(RELATIONSHIP_GOALS, g)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="details" className={card}>
        <h2 id="details" className="sr-only">Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          {details.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}>
              <dt className="text-dusk">{k}</dt>
              <dd className="text-base">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Membership" className={`${card} divide-y divide-line`}>
        <div className="flex items-center justify-between pb-4">
          <span>Member since</span>
          <span className="text-dusk">
            {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="pt-4">
          <p>Verifications</p>
          <ul className="mt-3 flex gap-3 text-sm">
            <li className={`rounded-full border px-3 py-1 ${p.photo_verified ? "border-brass text-brass" : "border-line text-dusk opacity-60"}`}>
              Photo verified{p.photo_verified ? "" : ": not yet"}
            </li>
            <li className={`rounded-full border px-3 py-1 ${p.id_verified ? "border-brass text-brass" : "border-line text-dusk opacity-60"}`}>
              ID verified{p.id_verified ? "" : ": not yet"}
            </li>
          </ul>
        </div>
      </section>

      {!own && (
        <section aria-label="Between you" className={`${card} space-y-2`}>
          <div className="flex justify-between"><span>You liked {name}</span><span className="text-dusk">{iLiked ? "Yes" : "Not yet"}</span></div>
          <div className="flex justify-between"><span>{name} liked you</span><span className="text-dusk">{theyLiked ? "Yes" : "Not yet"}</span></div>
        </section>
      )}

      {!own && <LikeFab id={p.id} name={name} liked={Boolean(iLiked)} />}
      <MessageBar profileId={p.id} name={name} own={own} />
    </article>
  );
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
      <Profile params={params} />
    </Suspense>
  );
}
