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
import { AreaField } from "../area-field";
import { MultiSelect } from "../multi-select";
import { DualRangeField, RangeField } from "../sliders";
import { applyFilters, resetFilters } from "../actions";
import { ANYWHERE, parseFilters, withSavedFilters, type Search } from "../search";

export const metadata: Metadata = { title: "Search filters" };

async function SearchContent({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const sp = await withSavedFilters(await searchParams);
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
