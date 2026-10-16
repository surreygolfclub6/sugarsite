"use client";

import { useRef, useState, useTransition } from "react";
import { Pills } from "@/components/pills";
import { SelectField } from "@/components/select-field";
import { PlacePicker } from "@/app/onboarding/place-picker";
import {
  BODY_TYPES,
  ETHNICITIES,
  GENDERS,
  HAIR_COLOURS,
  HEIGHTS,
  RELATIONSHIP_GOALS,
  RELATIONSHIP_STATUSES,
  SEEKING,
} from "@/lib/profile-options";
import { updateProfile, type EditProfileState } from "./actions";

export type EditableProfile = {
  display_name: string;
  gender: string;
  seeking: string[];
  place: { id: number; text: string } | null;
  relationship_status: string;
  relationship_goals: string[];
  height_cm: string;
  body_type: string;
  hair_colour: string;
  ethnicity: string;
  headline: string;
  bio: string;
  looking_for: string;
  birthdate_label: string;
};

export function EditProfileForm({ profile }: { profile: EditableProfile }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<EditProfileState>({});
  const form = useRef<HTMLFormElement>(null);
  const section = "rounded-2xl border border-line bg-velvet p-5 space-y-5";

  return (
    <form
      ref={form}
      noValidate
      aria-label="Edit profile"
      className="mt-6 space-y-4"
      // Submitted by hand, not as a form action, so a validation error doesn't reset the fields.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setState({});
        startTransition(async () => setState(await updateProfile(state, data)));
      }}
    >
      <section aria-labelledby="basics" className={section}>
        <h2 id="basics" className="display text-2xl">The basics</h2>
        <div>
          <label htmlFor="display_name" className="mb-1.5 block text-sm font-medium">First name or nickname</label>
          <input id="display_name" name="display_name" defaultValue={profile.display_name} maxLength={40} className="field" />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Date of birth</p>
          <p className="text-dusk">{profile.birthdate_label}</p>
          <p className="mt-1 text-sm text-dusk">Your age is fixed when you join. Contact support if it’s wrong.</p>
        </div>
        <PlacePicker initial={profile.place ?? undefined} />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">I am a</legend>
          <Pills name="gender" options={GENDERS} type="radio" defaultValues={[profile.gender]} />
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">I’m looking for</legend>
          <Pills name="seeking" options={SEEKING} type="checkbox" defaultValues={profile.seeking} />
        </fieldset>
      </section>

      <section aria-labelledby="relationship" className={section}>
        <h2 id="relationship" className="display text-2xl">Relationship</h2>
        <SelectField id="relationship_status" label="Relationship status" options={RELATIONSHIP_STATUSES} defaultValue={profile.relationship_status} />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">What kind of relationship are you looking for?</legend>
          <Pills name="relationship_goals" options={RELATIONSHIP_GOALS} type="checkbox" defaultValues={profile.relationship_goals} />
        </fieldset>
      </section>

      <section aria-labelledby="appearance" className={section}>
        <h2 id="appearance" className="display text-2xl">Appearance</h2>
        <SelectField id="height_cm" label="Height" options={HEIGHTS} defaultValue={profile.height_cm} />
        <SelectField id="body_type" label="Body type" options={BODY_TYPES} defaultValue={profile.body_type} />
        <SelectField id="hair_colour" label="Hair colour" options={HAIR_COLOURS} defaultValue={profile.hair_colour} />
        <SelectField id="ethnicity" label="Ethnicity" options={ETHNICITIES} defaultValue={profile.ethnicity} />
      </section>

      <section aria-labelledby="about" className={section}>
        <h2 id="about" className="display text-2xl">In your own words</h2>
        <div>
          <label htmlFor="headline" className="mb-1.5 block text-sm font-medium">Headline (optional)</label>
          <input id="headline" name="headline" defaultValue={profile.headline} maxLength={120} className="field" />
        </div>
        <div>
          <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">About you</label>
          <textarea id="bio" name="bio" defaultValue={profile.bio} rows={6} maxLength={1200} className="field" />
        </div>
        <div>
          <label htmlFor="looking_for" className="mb-1.5 block text-sm font-medium">What you’re looking for (optional)</label>
          <textarea id="looking_for" name="looking_for" defaultValue={profile.looking_for} rows={4} maxLength={800} className="field" />
        </div>
      </section>

      <div aria-live="polite" className="min-h-5">
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {state.saved && <p role="status" className="text-sm text-brass">Saved.</p>}
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
