"use server";

import { placeLabel } from "@/lib/places";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MIN_AGE } from "@/lib/config";
import { ageCheckEnabled } from "@/lib/age-assurance";
import { approvalRequired } from "@/lib/approval";
import { notifyAdminsNewMember } from "@/lib/admin-notify";
import { ONBOARDING_STEP_FIELDS } from "@/lib/profile-options";
import { profileInput, profileSchema } from "@/lib/profile-schema";

// `step` tells the form which step holds the problem so it can jump there.
export type OnboardingState = { error?: string; step?: number };

function stepOf(field: unknown) {
  const i = ONBOARDING_STEP_FIELDS.findIndex((fields) => (fields as readonly unknown[]).includes(field));
  return i === -1 ? undefined : i;
}

function ageFrom(birthdate: string) {
  const dob = new Date(`${birthdate}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

const schema = profileSchema.extend({
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth."),
});

export async function completeOnboarding(
  _: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only a new, incomplete profile goes through onboarding. After that, age is fixed.
  const { data: current } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (current && current.status !== "incomplete") redirect("/discover");

  const parsed = schema.safeParse({ ...profileInput(formData), birthdate: formData.get("birthdate") });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, step: stepOf(issue.path[0]) };
  }

  const data = parsed.data;
  if (ageFrom(data.birthdate) < MIN_AGE) {
    return { error: `You must be ${MIN_AGE} or over to use this site.`, step: stepOf("birthdate") };
  }

  const { count: photoCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!photoCount) return { error: "Add at least one photo.", step: stepOf("photo_id") };

  // The place must exist in our reference data. City, place and birthdate are written by the
  // server only (members have no column grant), so they can't be edited directly.
  const { data: place } = await supabase
    .from("uk_places")
    .select("id, name, county, nation")
    .eq("id", data.place_id)
    .single();
  if (!place) return { error: "Choose your location from the list.", step: stepOf("place_id") };

  const admin = createAdminClient();
  const { error: placeError } = await admin
    .from("profiles")
    .update({ place_id: place.id, city: placeLabel(place), birthdate: data.birthdate })
    .eq("id", user.id);
  if (placeError) return { error: "We couldn’t save your profile. Please try again." };

  // Descriptive fields: the member's own row, allowed by RLS and column grants.
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

  // Status can't be changed by members, so move it forward server-side. With age checks on, the profile
  // waits (pending_review) until the member passes the check; otherwise it goes live immediately.
  // Either way only photos wait for moderator review.
  // The order is: finish the profile, pass the age check, wait for approval, go live. A step is skipped when it's off.
  const checkAge = ageCheckEnabled();
  const needsApproval = await approvalRequired();
  const next = checkAge ? "pending_review" : needsApproval ? "awaiting_approval" : "active";
  await admin
    .from("profiles")
    .update({ status: next })
    .eq("id", user.id)
    .eq("status", "incomplete");
  // With an age check first, the moderators hear about them once they pass it.
  if (!checkAge) after(() => notifyAdminsNewMember(user.id).catch(() => {}));

  redirect(checkAge ? "/age-check" : needsApproval ? "/awaiting-approval" : "/discover");
}
