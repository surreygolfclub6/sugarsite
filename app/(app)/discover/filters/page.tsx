import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupPath } from "@/lib/member-status";
import {
  BODY_TYPES,
  ETHNICITIES,
  HAIR_COLOURS,
  MAX_HEIGHT_CM,
  MIN_HEIGHT_CM,
  RELATIONSHIP_GOALS,
  RELATIONSHIP_STATUSES,
} from "@/lib/profile-options";
import { placeLabel } from "@/lib/places";
import { Toast } from "@/components/toast";
import { SavedPicker } from "./saved-picker";
import { AreaField } from "../area-field";
import { MultiSelect } from "../multi-select";
import { DualRangeField, RangeField } from "../sliders";
import { applyFilters, deleteSavedSearch, editSavedSearch, openSavedSearch, resetFilters, saveSearch } from "../actions";
import { ANYWHERE, parseFilters, withSavedFilters, type Search } from "../search";

export const metadata: Metadata = { title: "Search filters" };

const SAVED_NOTES: Record<string, string> = {
  name: "Give the search a name first.",
  limit: "You can save up to 20 searches. Delete one to make room.",
  error: "We couldn’t save that search. Please try again.",
  deleted: "Search deleted.",
};

// A short description of a saved search, e.g. "Ages 25 to 40 · within 30 miles · near Oxford".
function describe(query: string, areas: Map<number, string>) {
  const q: Search = Object.create(null);
  for (const [key, value] of new URLSearchParams(query)) {
    const cur = q[key];
    q[key] = cur === undefined ? value : Array.isArray(cur) ? [...cur, value] : [cur, value];
  }
  const f = parseFilters(q);
  const parts = [];
  if (f.ageMin > 18 || f.ageMax < 99) parts.push(`Ages ${f.ageMin} to ${f.ageMax}`);
  parts.push(f.miles >= ANYWHERE ? "anywhere in the UK" : `within ${f.miles} miles`);
  if (f.areaId) parts.push(`of ${areas.get(f.areaId) ?? "another area"}`);
  if (f.heightMin > MIN_HEIGHT_CM || f.heightMax < MAX_HEIGHT_CM) parts.push(`${f.heightMin} to ${f.heightMax} cm`);
  const extra = [f.goals, f.status, f.body, f.hair, f.ethnicity].filter((x) => x.length).length;
  if (extra) parts.push(`${extra} more ${extra === 1 ? "filter" : "filters"}`);
  return parts.join(" · ");
}

async function SearchContent({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const sp = await withSavedFilters(params);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("status, place_id, city")
    .eq("id", user.id)
    .single();
  const setup = setupPath(me?.status);
  if (!me || setup) redirect(setup ?? "/onboarding");

  const { data: saved } = await supabase.from("saved_searches").select("id, name, query, sort").order("created_at", { ascending: false });
  const areaIds = [...new Set((saved ?? []).map((s) => Number(new URLSearchParams(s.query).get("area"))).filter((n) => Number.isInteger(n) && n > 0))];
  const { data: areaRows } = areaIds.length ? await supabase.from("uk_places").select("id, name, county, nation").in("id", areaIds) : { data: [] };
  const areas = new Map((areaRows ?? []).map((a) => [a.id, placeLabel(a)]));
  const note = params.saved === "ok" ? `Saved “${String(params.name ?? "").slice(0, 40)}”.` : SAVED_NOTES[String(params.saved)];

  const f = parseFilters(sp);
  const { data: area } = f.areaId
    ? await supabase.from("uk_places").select("id, name, county, nation").eq("id", f.areaId).single()
    : { data: null };
  const initialArea = area ? { id: area.id, text: placeLabel(area) } : null;

  // "Select all" is stored as no filter, so show it as all-selected again when the form is reopened.
  const all = (picked: string[], options: readonly { value: string }[]) =>
    picked.length ? picked : options.map((o) => o.value);

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <h1 className="display text-4xl">Search filters</h1>
        <Link href={`/discover?${sp.sort ? `sort=${f.sort}` : ""}`} className="btn btn-quiet">Back</Link>
      </div>

      <Toast key={String(params.t ?? "")} message={note} tone={params.saved === "ok" || params.saved === "deleted" ? "info" : "error"} cleanPath="/discover/filters" />

      {saved && saved.length > 0 && (
        <SavedPicker
          items={saved.map((s) => ({ id: s.id, name: s.name, summary: describe(s.query, areas) }))}
          open={openSavedSearch}
          edit={editSavedSearch}
          remove={deleteSavedSearch}
        />
      )}

      <form key={JSON.stringify(sp)} action={applyFilters} aria-label="Search" className="mt-6 space-y-8">
        <input type="hidden" name="sort" value={f.sort} />
        <div className="grid gap-6 md:grid-cols-2">
          <AreaField myArea={me.place_id ? me.city : null} initialArea={initialArea} />
          <RangeField name="miles" label="Distance" kind="miles" min={5} max={ANYWHERE} step={5} defaultValue={f.miles} />
          <DualRangeField nameMin="age_min" nameMax="age_max" label="Age" minLabel="Minimum age" maxLabel="Maximum age" kind="age" min={18} max={99} step={1} defaultMin={f.ageMin} defaultMax={f.ageMax} />
          <DualRangeField nameMin="height_min" nameMax="height_max" label="Height" minLabel="Minimum height" maxLabel="Maximum height" kind="height" min={MIN_HEIGHT_CM} max={MAX_HEIGHT_CM} step={1} defaultMin={f.heightMin} defaultMax={f.heightMax} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <MultiSelect name="goal" label="They’re looking for" options={RELATIONSHIP_GOALS} defaultValues={all(f.goals, RELATIONSHIP_GOALS)} />
          <MultiSelect name="status" label="Relationship status" options={RELATIONSHIP_STATUSES} defaultValues={all(f.status, RELATIONSHIP_STATUSES)} />
          <MultiSelect name="body" label="Body type" options={BODY_TYPES} defaultValues={all(f.body, BODY_TYPES)} />
          <MultiSelect name="hair" label="Hair colour" options={HAIR_COLOURS} defaultValues={all(f.hair, HAIR_COLOURS)} />
          <MultiSelect name="ethnicity" label="Ethnicity" options={ETHNICITIES} defaultValues={all(f.ethnicity, ETHNICITIES)} />
        </div>

        <div className="flex gap-3">
          <button className="btn btn-primary">Search</button>
          <button type="submit" formAction={resetFilters} className="btn btn-quiet">Reset</button>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <label htmlFor="search_name" className="text-sm font-medium">Save this search</label>
          <p className="mt-1 text-xs text-dusk">Give it a name to come back to it later, for example “Oxford, 30 to 45”. You can keep up to 20.</p>
          <div className="mt-3 flex gap-2">
            <input id="search_name" name="search_name" maxLength={40} placeholder="Name this search" className="field min-w-0 flex-1" autoComplete="off" />
            <button type="submit" formAction={saveSearch} className="btn btn-quiet">Save</button>
          </div>
        </div>
      </form>
    </>
  );
}

export default function DiscoverPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<div className="mt-6" aria-busy="true" />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}
