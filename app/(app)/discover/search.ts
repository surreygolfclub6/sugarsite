import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BODY_TYPES,
  ETHNICITIES,
  HAIR_COLOURS,
  MAX_HEIGHT_CM,
  MIN_HEIGHT_CM,
  RELATIONSHIP_GOALS,
  RELATIONSHIP_STATUSES,
} from "@/lib/profile-options";

export type Search = Record<string, string | string[] | undefined>;

export type Card = {
  id: string;
  display_name: string;
  age: number;
  city: string;
  distance_miles: number | null;
  liked: boolean;
  photo_count: number;
  online: boolean;
  age_verified: boolean;
  photo: string | null;
};

export const SORTS = [
  { value: "nearest", label: "Nearest" },
  { value: "active", label: "Recently active" },
  { value: "newest", label: "Newest" },
] as const;

export const PAGE_SIZE = 12;
export const ANYWHERE = 300;

const num = (v: string | string[] | undefined, fallback: number, min: number, max: number) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

// Choosing every option is the same as not filtering, so members who left a field blank still appear.
const choices = (v: string | string[] | undefined, options: readonly { value: string }[]) => {
  const picked = (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter((x) => options.some((o) => o.value === x));
  const unique = [...new Set(picked)];
  return unique.length === options.length ? [] : unique;
};

// The form fields that make up a search. They're remembered on this device until the member resets them.
export const FILTER_KEYS = ["miles", "where", "area", "age_min", "age_max", "height_min", "height_max", "goal", "status", "body", "hair", "ethnicity"] as const;
export const SEARCH_COOKIE = "search_filters";

// When the address carries no filters of its own, use the ones the member saved last time.
export async function withSavedFilters(sp: Search): Promise<Search> {
  if (FILTER_KEYS.some((k) => sp[k] !== undefined)) return sp;
  const saved = (await cookies()).get(SEARCH_COOKIE)?.value;
  if (!saved) return sp;
  const merged: Search = { ...sp };
  for (const [key, value] of new URLSearchParams(saved)) {
    if (!(FILTER_KEYS as readonly string[]).includes(key)) continue;
    const current = merged[key];
    merged[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
  }
  return merged;
}

export function parseFilters(sp: Search) {
  const sort = SORTS.find((o) => o.value === sp.sort)?.value ?? "nearest";
  const ageA = num(sp.age_min, 18, 18, 99);
  const ageB = num(sp.age_max, 99, 18, 99);
  const heightA = num(sp.height_min, MIN_HEIGHT_CM, MIN_HEIGHT_CM, MAX_HEIGHT_CM);
  const heightB = num(sp.height_max, MAX_HEIGHT_CM, MIN_HEIGHT_CM, MAX_HEIGHT_CM);
  return {
    sort,
    ageMin: Math.min(ageA, ageB),
    ageMax: Math.max(ageA, ageB),
    heightMin: Math.min(heightA, heightB),
    heightMax: Math.max(heightA, heightB),
    miles: num(sp.miles, 50, 5, ANYWHERE),
    areaId: sp.where === "other" ? num(sp.area, 0, 0, 2147483647) : 0,
    goals: choices(sp.goal, RELATIONSHIP_GOALS),
    body: choices(sp.body, BODY_TYPES),
    hair: choices(sp.hair, HAIR_COLOURS),
    status: choices(sp.status, RELATIONSHIP_STATUSES),
    ethnicity: choices(sp.ethnicity, ETHNICITIES),
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Other members' photos live in a private bucket, so the server signs short-lived URLs for
// approved public photos only (their first one is the tile picture; private photos never appear on tiles).
export async function firstPhotos(supabase: Supabase, ids: string[]) {
  const { data: photos } = ids.length
    ? await supabase
        .from("photos")
        .select("user_id, storage_path")
        .in("user_id", ids)
        .eq("moderation", "approved")
        .eq("visibility", "public")
        .order("position")
    : { data: [] };
  const first = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const p of photos ?? []) {
    counts.set(p.user_id, (counts.get(p.user_id) ?? 0) + 1);
    if (!first.has(p.user_id)) first.set(p.user_id, p.storage_path);
  }
  const { data: signed } = first.size
    ? await createAdminClient().storage.from("photos").createSignedUrls([...first.values()], 3600)
    : { data: [] };
  return new Map(
    ids.map((id) => [
      id,
      { url: signed?.find((s) => s.path === first.get(id))?.signedUrl ?? null, count: counts.get(id) ?? 0 },
    ]),
  );
}

export async function findProfiles(sp: Search, page: number): Promise<{ cards: Card[]; hasNext: boolean }> {
  const f = parseFilters(sp);
  const supabase = await createClient();
  const { data } = await supabase.rpc("discover_profiles", {
    age_min: f.ageMin,
    age_max: f.ageMax,
    max_miles: f.miles >= ANYWHERE ? null : f.miles,
    center_place: f.areaId || null,
    // Matching on who you're seeking and who seeks you is done in the database, so there is no gender filter.
    genders: null,
    goals: f.goals.length ? f.goals : null,
    body_types: f.body.length ? f.body : null,
    hair_colours: f.hair.length ? f.hair : null,
    relationship_statuses: f.status.length ? f.status : null,
    ethnicities: f.ethnicity.length ? f.ethnicity : null,
    height_min: f.heightMin > MIN_HEIGHT_CM ? f.heightMin : null,
    height_max: f.heightMax < MAX_HEIGHT_CM ? f.heightMax : null,
    sort_by: f.sort,
    page_offset: (page - 1) * PAGE_SIZE,
    page_size: PAGE_SIZE + 1,
  });
  const rows = (data ?? []) as Omit<Card, "photo">[];
  const shown = rows.slice(0, PAGE_SIZE);
  const photos = await firstPhotos(supabase, shown.map((c) => c.id));
  return {
    hasNext: rows.length > PAGE_SIZE,
    cards: shown.map((c) => ({ ...c, photo: photos.get(c.id)?.url ?? null })),
  };
}
