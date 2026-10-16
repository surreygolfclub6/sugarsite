import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { touchActive } from "@/lib/activity";
import { ageFrom, isOnline } from "@/lib/people";
import { firstPhotos, type Card } from "../discover/search";
import { TileGrid } from "../discover/tile-grid";

export const metadata: Metadata = { title: "Interests" };

async function Interests({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await connection();
  const { tab: raw } = await searchParams;
  const tab = raw === "liked" ? "liked" : "received";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await touchActive(user.id);

  // The likes table only lets you see likes you sent or received.
  const { data: likes } = await supabase
    .from("likes")
    .select("from_user, to_user")
    .eq(tab === "liked" ? "from_user" : "to_user", user.id)
    .order("created_at", { ascending: false })
    .limit(48);
  const ids = (likes ?? []).map((l) => (tab === "liked" ? l.to_user : l.from_user));

  const { data: mine } = ids.length
    ? await supabase.from("likes").select("to_user").eq("from_user", user.id).in("to_user", ids)
    : { data: [] };
  const likedByMe = new Set((mine ?? []).map((l) => l.to_user));

  // Row-level security drops members who are inactive or blocked, so they quietly disappear.
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, display_name, birthdate, city, last_active_at").in("id", ids)
    : { data: [] };
  const photos = await firstPhotos(supabase, (profiles ?? []).map((p) => p.id));

  const cards: Card[] = ids.flatMap((id) => {
    const p = profiles?.find((x) => x.id === id);
    if (!p) return [];
    return [
      {
        id,
        display_name: p.display_name ?? "",
        age: ageFrom(p.birthdate),
        city: p.city ?? "",
        distance_miles: null,
        liked: likedByMe.has(id),
        photo_count: photos.get(id)?.count ?? 0,
        online: isOnline(p.last_active_at),
        photo: photos.get(id)?.url ?? null,
      },
    ];
  });

  const tabs = [
    { key: "received", label: "Liked you" },
    { key: "liked", label: "You liked" },
  ] as const;

  return (
    <>
      <h1 className="display px-1 text-4xl">Interests</h1>
      <nav aria-label="Interests" className="mt-3 flex border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/interests?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px flex-1 border-b-2 py-3 text-center text-sm ${tab === t.key ? "border-pearl text-pearl" : "border-transparent text-dusk"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {cards.length === 0 ? (
        <p className="mt-10 text-dusk">
          {tab === "received"
            ? "No one has liked you yet. Keep your photos up to date and check back soon."
            : "You haven’t liked anyone yet. Find people on the Search tab."}
        </p>
      ) : (
        <TileGrid key={tab} initialCards={cards} initialHasNext={false} query="" />
      )}
    </>
  );
}

export default function InterestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
      <Interests searchParams={searchParams} />
    </Suspense>
  );
}
