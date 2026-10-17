"use server";

import { placeLabel } from "@/lib/places";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findProfiles, type Search } from "./search";

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
