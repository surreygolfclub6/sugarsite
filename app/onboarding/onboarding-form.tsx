"use client";

import { useRef, useState, useTransition } from "react";
import {
  BODY_TYPES,
  ETHNICITIES,
  GENDERS,
  HAIR_COLOURS,
  HEIGHTS,
  ONBOARDING_STEP_FIELDS,
  RELATIONSHIP_GOALS,
  RELATIONSHIP_STATUSES,
  SEEKING,
} from "@/lib/profile-options";
import { completeOnboarding, type OnboardingState } from "./actions";
import { Pills } from "@/components/pills";
import { SelectField as Select } from "@/components/select-field";
import { PhotoStep, type Photo } from "./photo-step";
import { PlacePicker } from "./place-picker";

const STEPS = ["The basics", "Relationship", "Appearance", "About you", "Photos"] as const;

export function OnboardingForm({
  maxBirthdate,
  userId,
  initialPhotos,
}: {
  maxBirthdate: string;
  userId: string;
  initialPhotos: Photo[];
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<OnboardingState>({});
  const [step, setStep] = useState(0);
  const [clientError, setClientError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const last = step === STEPS.length - 1;

  // Every step stays mounted (hidden) so one submit sends all fields.
  const hide = (i: number) => (i === step ? "space-y-5" : "hidden");

  function stepIsComplete() {
    const data = new FormData(formRef.current!);
    return ONBOARDING_STEP_FIELDS[step].every((field) =>
      data.getAll(field).some((v) => String(v).trim() !== ""),
    );
  }

  function next() {
    if (!stepIsComplete()) {
      setClientError("Please answer everything on this step to continue.");
      return;
    }
    setClientError(undefined);
    setStep(step + 1);
  }

  return (
    // Not a form `action`: React 19 resets uncontrolled fields after an action finishes,
    // even on a validation error, which wiped every step.
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (!stepIsComplete()) {
          setClientError("Please answer everything on this step to continue.");
          return;
        }
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await completeOnboarding(state, data);
          setState(result);
          setClientError(undefined);
          // Jump to the step that holds the rejected field.
          if (result.step !== undefined) setStep(result.step);
        });
      }}
      noValidate
      className="mt-8"
    >
      <ol className="mb-8 flex gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? "bg-garnet" : "bg-line"}`} />
            <span className={`mt-2 block text-sm ${i === step ? "text-pearl" : "text-dusk"}`}>{label}</span>
          </li>
        ))}
      </ol>

      <div className={hide(0)}>
        <div>
          <label htmlFor="display_name" className="mb-1.5 block text-sm font-medium">First name or nickname</label>
          <input id="display_name" name="display_name" className="field" autoComplete="given-name" maxLength={40} />
        </div>
        <div>
          <label htmlFor="birthdate" className="mb-1.5 block text-sm font-medium">Date of birth</label>
          <input id="birthdate" name="birthdate" type="date" max={maxBirthdate} className="field" autoComplete="bday" />
          <p className="mt-1.5 text-sm text-dusk">Only your age is shown. You must be 18 or over.</p>
        </div>
        <PlacePicker />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">I am a</legend>
          <Pills name="gender" options={GENDERS} type="radio" />
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">I’m looking for</legend>
          <Pills name="seeking" options={SEEKING} type="checkbox" />
        </fieldset>
      </div>

      <div className={hide(1)}>
        <Select id="relationship_status" label="Relationship status" options={RELATIONSHIP_STATUSES} />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">What kind of relationship are you looking for?</legend>
          <Pills name="relationship_goals" options={RELATIONSHIP_GOALS} type="checkbox" />
          <p className="mt-1.5 text-sm text-dusk">Choose all that apply. Being clear saves everyone time.</p>
        </fieldset>
      </div>

      <div className={hide(2)}>
        <Select id="height_cm" label="Height" options={HEIGHTS} />
        <Select id="body_type" label="Body type" options={BODY_TYPES} />
        <Select id="hair_colour" label="Hair colour" options={HAIR_COLOURS} />
        <div>
          <Select id="ethnicity" label="Ethnicity" options={ETHNICITIES} />
          <p className="mt-1.5 text-sm text-dusk">
            This is sensitive information. By answering you agree to it being shown on your profile. Choose
            “Prefer not to say” if you’d rather not share it.
          </p>
        </div>
      </div>

      <div className={hide(3)}>
        <div>
          <label htmlFor="headline" className="mb-1.5 block text-sm font-medium">Headline (optional)</label>
          <input id="headline" name="headline" className="field" maxLength={120} placeholder="One line that sounds like you" />
        </div>
        <div>
          <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">About you</label>
          <textarea id="bio" name="bio" rows={6} maxLength={1200} className="field" placeholder="What you do, what you enjoy, what a good week looks like." />
        </div>
        <div>
          <label htmlFor="looking_for" className="mb-1.5 block text-sm font-medium">What you’re looking for (optional)</label>
          <textarea
            id="looking_for"
            name="looking_for"
            rows={4}
            maxLength={800}
            className="field"
            placeholder="Anything else about the kind of relationship you want and what matters to you in it."
          />
          <p className="mt-1.5 text-sm text-dusk">
            Be direct. Keep it respectful: requests for sexual services in exchange for payment aren’t allowed
            and will get a profile removed.
          </p>
        </div>
      </div>

      <div className={hide(4)}>
        <PhotoStep userId={userId} initial={initialPhotos} />
      </div>

      <div aria-live="polite" className="mt-5 min-h-5">
        {(clientError ?? state.error) && <p className="text-sm text-danger">{clientError ?? state.error}</p>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => {
              setClientError(undefined);
              setStep(step - 1);
            }}
            className="btn btn-quiet"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {last ? (
          <button key="submit" type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Saving…" : "Submit profile"}
          </button>
        ) : (
          <button key="continue" type="button" onClick={next} className="btn btn-primary">
            Continue
          </button>
        )}
      </div>
    </form>
  );
}
