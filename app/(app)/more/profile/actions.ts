"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { placeLabel } from "@/lib/places";
import { profileInput, profileSchema } from "@/lib/profile-schema";

export type EditProfileState = { error?: string; saved?: boolean };

export async function updateProfile(_: EditProfileState, formData: FormData): Promise<EditProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = profileSchema.safeParse(profileInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  // Location is written by the server from a place that exists in our data, never by the member directly.
  const { data: place } = await supabase.from("uk_places").select("id, name, county, nation").eq("id", data.place_id).single();
  if (!place) return { error: "Choose your location from the list." };
  const { error: placeError } = await createAdminClient()
    .from("profiles")
    .update({ place_id: place.id, city: placeLabel(place) })
    .eq("id", user.id);
  if (placeError) return { error: "We couldn’t save your profile. Please try again." };

  // Birthdate and status aren't editable: age is fixed at sign-up and status is set by moderators.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: data.display_name,
      gender: data.gender,
      seeking: data.seeking,
      relationship_status: data.relationship_status,
      relationship_goals: data.relationship_goals,
      height_cm: data.height_cm,
      body_type: data.body_type,
      hair_colour: data.hair_colour,
      ethnicity: data.ethnicity,
      headline: data.headline ?? null,
      bio: data.bio,
      looking_for: data.looking_for ?? null,
    })
    .eq("id", user.id);
  if (error) return { error: "We couldn’t save your profile. Please try again." };
  return { saved: true };
}
