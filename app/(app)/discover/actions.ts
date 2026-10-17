"use server";

import { placeLabel } from "@/lib/places";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FILTER_KEYS, SEARCH_COOKIE, SORTS, findProfiles, type Search } from "./search";

export async function toggleLike(formData: FormData): Promise<{ matched: boolean }> {
  const target = z.string().uuid().parse(formData.get("profile_id"));
  const liked = formData.get("liked") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { matched: false };

  // Row-level security rejects blocked pairs and likes from anyone but the signed-in member.
  if (liked) {
    await supabase.from("likes").delete().eq("from_user", user.id).eq("to_user", target);
    return { matched: false };
  }
  const { error } = await supabase.from("likes").insert({ from_user: user.id, to_user: target });
  if (error) return { matched: false };
  // A match is two members who have both liked each other. You can see likes you received, so this is just a lookup.
  const { data: back } = await supabase.from("likes").select("from_user").eq("from_user", target).eq("to_user", user.id).maybeSingle();
  return { matched: Boolean(back) };
}

// The filter fields of the search form, as a query string. Only known fields are kept.
function queryFrom(formData: FormData) {
  const q = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    for (const value of formData.getAll(key)) if (typeof value === "string" && value) q.append(key, value);
  }
  return q.toString();
}

// Remembers a search on this device, so the next visit starts from the same filters.
async function remember(saved: string) {
  const jar = await cookies();
  if (saved && saved.length < 1500) {
    jar.set(SEARCH_COOKIE, saved, { maxAge: 60 * 60 * 24 * 365, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  } else {
    jar.delete(SEARCH_COOKIE);
  }
}

// Saves the search form on this device, so the next visit starts from the same filters.
export async function applyFilters(formData: FormData) {
  await remember(queryFrom(formData));
  const sort = SORTS.find((o) => o.value === formData.get("sort"))?.value;
  redirect(sort && sort !== "nearest" ? `/discover?sort=${sort}` : "/discover");
}

// Keeps the current form as a named search the member can come back to. Saving under a name already used replaces it.
export async function saveSearch(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = z.string().trim().min(1).max(40).safeParse(formData.get("search_name"));
  if (!name.success) redirect(`/discover/filters?saved=name&t=${Date.now()}`);
  const query = queryFrom(formData);
  if (query.length > 1500) redirect(`/discover/filters?saved=error&t=${Date.now()}`);
  const sort = SORTS.find((o) => o.value === formData.get("sort"))?.value ?? "nearest";

  const { data: existing } = await supabase.from("saved_searches").select("id, name");
  const same = existing?.find((s) => s.name.toLowerCase() === name.data.toLowerCase());
  const { error } = same
    ? await supabase.from("saved_searches").update({ name: name.data, query, sort }).eq("id", same.id)
    : await supabase.from("saved_searches").insert({ user_id: user.id, name: name.data, query, sort });
  if (error) redirect(`/discover/filters?saved=${error.message.includes("up to 20") ? "limit" : "error"}&t=${Date.now()}`);
  await remember(query);
  redirect(`/discover/filters?saved=ok&name=${encodeURIComponent(name.data)}&t=${Date.now()}`);
}

// Brings a saved search back: straight to its results (openSavedSearch), or into the form to adjust first (editSavedSearch).
async function loadSavedSearch(formData: FormData, to: "results" | "filters") {
  const supabase = await createClient();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/discover/filters");
  const { data } = await supabase.from("saved_searches").select("query, sort").eq("id", id.data).maybeSingle();
  if (!data) redirect("/discover/filters");
  await remember(data.query);
  // A different address from the page the member is on, so the form is rebuilt from the loaded search.
  if (to === "filters") redirect(`/discover/filters?loaded=${encodeURIComponent(id.data)}`);
  redirect(data.sort !== "nearest" ? `/discover?sort=${data.sort}` : "/discover");
}

export async function openSavedSearch(formData: FormData) {
  await loadSavedSearch(formData, "results");
}

export async function editSavedSearch(formData: FormData) {
  await loadSavedSearch(formData, "filters");
}

export async function deleteSavedSearch(formData: FormData) {
  const supabase = await createClient();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (id.success) await supabase.from("saved_searches").delete().eq("id", id.data);
  redirect(`/discover/filters?saved=deleted&t=${Date.now()}`);
}

// Back to the defaults. This is the only thing that clears saved filters.
export async function resetFilters() {
  (await cookies()).delete(SEARCH_COOKIE);
  redirect("/discover/filters");
}

// Infinite scroll: the results list asks for the next page of the same search.
export async function loadMoreProfiles(query: string, page: number) {
  // The query is built by our own page; anything oversized is not.
  if (typeof query !== "string" || query.length > 2000) return { cards: [], hasNext: false };
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
