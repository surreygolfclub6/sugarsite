// Single source of truth for profile choices. Values must match the check
// constraints in supabase/migrations/*_profile_attributes.sql.
type Option = { value: string; label: string };

export const GENDERS: Option[] = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non-binary", label: "Non-binary person" },
];

export const SEEKING: Option[] = [
  { value: "woman", label: "Women" },
  { value: "man", label: "Men" },
  { value: "non-binary", label: "Non-binary people" },
];

export const RELATIONSHIP_STATUSES: Option[] = [
  { value: "single", label: "Single" },
  { value: "separated", label: "Separated" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "open", label: "In an open relationship" },
  { value: "complicated", label: "It’s complicated" },
];

export const RELATIONSHIP_GOALS: Option[] = [
  { value: "casual", label: "Casual dating" },
  { value: "no_strings", label: "No strings attached" },
  { value: "long_term", label: "Long-term relationship" },
  { value: "marriage", label: "Marriage minded" },
  { value: "friendship", label: "Friendship" },
  { value: "not_sure", label: "Not sure yet" },
];

export const BODY_TYPES: Option[] = [
  { value: "slim", label: "Slim" },
  { value: "athletic", label: "Athletic" },
  { value: "average", label: "Average" },
  { value: "curvy", label: "Curvy" },
  { value: "muscular", label: "Muscular" },
  { value: "few_extra", label: "A few extra pounds" },
  { value: "plus_size", label: "Plus size" },
];

export const HAIR_COLOURS: Option[] = [
  { value: "black", label: "Black" },
  { value: "brown", label: "Brown" },
  { value: "blonde", label: "Blonde" },
  { value: "red", label: "Red" },
  { value: "grey", label: "Grey" },
  { value: "white", label: "White" },
  { value: "bald", label: "Bald or shaved" },
  { value: "other", label: "Other" },
];

export const ETHNICITIES: Option[] = [
  { value: "asian", label: "Asian" },
  { value: "black", label: "Black" },
  { value: "hispanic", label: "Hispanic or Latino" },
  { value: "middle_eastern", label: "Middle Eastern" },
  { value: "mixed", label: "Mixed" },
  { value: "white", label: "White" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const MIN_HEIGHT_CM = 137;
export const MAX_HEIGHT_CM = 213;

export const HEIGHTS: Option[] = Array.from({ length: MAX_HEIGHT_CM - MIN_HEIGHT_CM + 1 }, (_, i) => {
  const cm = MIN_HEIGHT_CM + i;
  const totalInches = Math.round(cm / 2.54);
  return { value: String(cm), label: `${cm} cm (${Math.floor(totalInches / 12)}'${totalInches % 12}")` };
});

// Required fields on each onboarding step, in order. Used for the Continue check
// in the form and to jump back to the right step when the server rejects a field.
export const ONBOARDING_STEP_FIELDS = [
  ["display_name", "birthdate", "place_id", "gender", "seeking"],
  ["relationship_status", "relationship_goals"],
  ["height_cm", "body_type", "hair_colour", "ethnicity"],
  ["bio"],
  ["photo_id"],
] as const;

export const values =(options: Option[]) => options.map((o) => o.value) as [string, ...string[]];

export const labelOf = (options: Option[], value: string | null | undefined) =>
  options.find((o) => o.value === value)?.label ?? null;
