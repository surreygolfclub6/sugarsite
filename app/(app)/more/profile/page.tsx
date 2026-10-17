import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupPath } from "@/lib/member-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditProfileForm } from "./edit-form";

export const metadata: Metadata = { title: "Edit profile" };

async function Edit() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p } = await supabase
    .from("profiles")
    .select("status, display_name, gender, seeking, place_id, city, relationship_status, relationship_goals, height_cm, body_type, hair_colour, ethnicity, headline, bio, looking_for")
    .eq("id", user.id)
    .single();
  const setup = setupPath(p?.status);
  if (!p || setup) redirect(setup ?? "/onboarding");

  // Members can't read birthdates through the API, not even their own. The id comes from the verified session.
  const { data: own } = await createAdminClient().from("profiles").select("birthdate").eq("id", user.id).single();

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <h1 className="display text-4xl">Edit profile</h1>
        <Link href={`/profile/${user.id}`} className="btn btn-quiet">Preview</Link>
      </div>
      <EditProfileForm
        profile={{
          display_name: p.display_name ?? "",
          gender: p.gender ?? "",
          seeking: p.seeking ?? [],
          place: p.place_id && p.city ? { id: p.place_id, text: p.city } : null,
          relationship_status: p.relationship_status ?? "",
          relationship_goals: p.relationship_goals ?? [],
          height_cm: p.height_cm ? String(p.height_cm) : "",
          body_type: p.body_type ?? "",
          hair_colour: p.hair_colour ?? "",
          ethnicity: p.ethnicity ?? "",
          headline: p.headline ?? "",
          bio: p.bio ?? "",
          looking_for: p.looking_for ?? "",
          birthdate_label: new Date(`${own?.birthdate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
        }}
      />
    </>
  );
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
      <Edit />
    </Suspense>
  );
}
