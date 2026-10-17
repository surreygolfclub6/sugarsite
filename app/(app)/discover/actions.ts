"use server";

import { placeLabel } from "@/lib/places";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FILTER_KEYS, SEARCH_COOKIE, SORTS, findProfiles, type Search } from "./search";

export async function toggleLike(formData: FormData) {
  const target = z.string().uuid().parse(formData.get("profile_id"));
  const liked = formData.get("liked") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Row-level security rejects blocked pairs and likes from anyone but the signed-in member.
  if (liked) await supabase.from("likes").delete().eq("from_user", user.id).eq("to_user", target);
  else await supabase.from("likes").insert({ from_user: user.id, to_user: target });
}

// Saves the search form on this device, so the next visit starts from the same filters.
export async function applyFilters(formData: FormData) {
  const q = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    for (const value of formData.getAll(key)) if (typeof value === "string" && value) q.append(key, value);
  }
  const saved = q.toString();
  const jar = await cookies();
  if (saved && saved.length < 1500) {
    jar.set(SEARCH_COOKIE, saved, { maxAge: 60 * 60 * 24 * 365, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  } else {
    jar.delete(SEARCH_COOKIE);
  }
  const sort = SORTS.find((o) => o.value === formData.get("sort"))?.value;
  redirect(sort && sort !== "nearest" ? `/discover?sort=${sort}` : "/discover");
}

// Back to the defaults. This is the only thing that clears saved filters.
export async function resetFilters() {
  (await cookies()).delete(SEARCH_COOKIE);
  redirect("/discover/filters");
}

// Infinite scroll: the results list asks for the next page of the same search.
export async function loadMoreProfiles(query: string, page: number) {
  const sp: Search = Object.create(null);
  for (const [key, value] of new URLSearchParams(query)) {
    const current = sp[key];
    sp[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
  }
  return findProfiles(sp, z.number().int().min(1).max(500).parse(page));
}

// For members who joined before location search existed. Same rules as onboarding: the place
// must exist in our data, and only the server writes it.
export async function setMyLocation(formData: FormData) {
  const placeId = z.coerce.number().int().safeParse(formData.get("place_id"));
  if (!placeId.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: place } = await supabase.from("uk_places").select("id, name, county, nation").eq("id", placeId.data).single();
  if (!place) return;

  await createAdminClient()
    .from("profiles")
    .update({ place_id: place.id, city: placeLabel(place) })
    .eq("id", user.id);
  revalidatePath("/discover");
}
