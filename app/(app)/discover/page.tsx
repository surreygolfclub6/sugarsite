import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after, connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupPath } from "@/lib/member-status";
import { touchActive } from "@/lib/activity";
import { PlacePicker } from "@/app/onboarding/place-picker";
import { SORTS, findProfiles, parseFilters, withSavedFilters, type Search } from "./search";
import { setMyLocation } from "./actions";
import { TileGrid } from "./tile-grid";

export const metadata: Metadata = { title: "Search" };

const withParams = (sp: Search, set: Record<string, string> = {}) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k in set || k === "blocked") continue;
    for (const x of Array.isArray(v) ? v : v ? [v] : []) q.append(k, x);
  }
  for (const [k, v] of Object.entries(set)) q.set(k, v);
  return q.toString();
};

async function Results({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const sp = await withSavedFilters(await searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("status, place_id").eq("id", user.id).single();
  const setup = setupPath(me?.status);
  if (!me || setup) redirect(setup ?? "/onboarding");
  // Recording activity is a write the page doesn't wait on, so it runs after the response is sent.
  after(() => touchActive(user.id));

  const { data: photos } = await supabase.from("photos").select("moderation").eq("user_id", user.id);
  const count = (m: string) => (photos ?? []).filter((p) => p.moderation === m).length;
  const pending = count("pending");
  const rejected = count("rejected");
  const approved = count("approved");

  const parsed = parseFilters(sp);
  const { sort } = parsed;
  // A dot on the filter button shows when anything other than the defaults is applied.
  const filtered = JSON.stringify({ ...parsed, sort: "" }) !== JSON.stringify({ ...parseFilters({}), sort: "" });
  const qs = withParams(sp, { sort });
  const { cards, hasNext } = me.status === "active" ? await findProfiles(sp, 1) : { cards: [], hasNext: false };

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <h1 className="display text-4xl">Search</h1>
        <Link href="/discover/filters" aria-label={filtered ? "Edit search (filters on)" : "Edit search"} className="btn btn-quiet relative !p-3">
          {filtered && <span aria-hidden className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-garnet" />}
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
            <circle cx="15" cy="7" r="2" />
            <circle cx="9" cy="17" r="2" />
          </svg>
        </Link>
      </div>

      <nav aria-label="Sort" className="mt-3 flex border-b border-line">
        {SORTS.map((o) => (
          <Link
            key={o.value}
            href={`/discover?${withParams(sp, { sort: o.value })}`}
            aria-current={sort === o.value ? "page" : undefined}
            className={`-mb-px flex-1 border-b-2 py-3 text-center text-sm ${sort === o.value ? "border-pearl text-pearl" : "border-transparent text-dusk"}`}
          >
            {o.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 space-y-3" aria-live="polite">
        {typeof sp.blocked === "string" && sp.blocked && (
          <p role="status" className="rounded-xl border border-line px-4 py-3 text-sm text-dusk">
            You blocked {sp.blocked.slice(0, 40)}. You can undo this under <Link href="/more/blocked" className="underline">More, Blocked members</Link>.
          </p>
        )}
        {rejected > 0 && (
          <p role="status" className="rounded-xl border border-line px-4 py-3 text-sm text-danger">
            {rejected === 1 ? "One of your photos wasn’t approved." : `${rejected} of your photos weren’t approved.`}{" "}
            <Link href="/photos" className="underline">Replace it</Link>
          </p>
        )}
        {pending > 0 && (
          <p role="status" className="rounded-xl border border-line px-4 py-3 text-sm text-dusk">
            Your profile is live. {pending === 1 ? "Your photo is" : "Your photos are"} being checked and will appear
            once approved.
          </p>
        )}
        {pending === 0 && approved === 0 && rejected === 0 && (
          <p role="status" className="rounded-xl border border-line px-4 py-3 text-sm text-dusk">
            You have no photos yet. <Link href="/photos" className="underline">Add some</Link>
          </p>
        )}
      </div>

      {me.status === "active" && !me.place_id && (
        <form action={setMyLocation} className="mt-4 space-y-3 rounded-xl border border-line p-4 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-x-4 lg:space-y-0" aria-label="Set your location">
          <p className="text-sm text-dusk lg:col-span-2 lg:mb-3">Add your location to see distances and search near you.</p>
          <PlacePicker name="place_id" label="Your location" />
          <button className="btn btn-primary !py-2">Save location</button>
        </form>
      )}

      {me.status === "suspended" ? (
        <section className="mt-16">
          <h2 className="display text-3xl">Your account is suspended.</h2>
          <p className="mt-3 text-dusk">Contact support if you think this is a mistake.</p>
        </section>
      ) : cards.length === 0 ? (
        <p className="mt-10 text-dusk">
          {me.status === "active"
            ? "No one matches yet. Try widening the distance or age range. New members join all the time."
            : "Your profile isn’t live yet, so there’s nothing to show. You’ll be able to search as soon as it’s approved."}
        </p>
      ) : (
        <TileGrid key={qs} initialCards={cards} initialHasNext={hasNext} query={qs} />
      )}
    </>
  );
}

export default function DiscoverPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}
