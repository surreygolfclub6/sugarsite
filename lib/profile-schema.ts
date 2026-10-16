import { z } from "zod";
import {
  BODY_TYPES,
  ETHNICITIES,
  GENDERS,
  HAIR_COLOURS,
  MAX_HEIGHT_CM,
  MIN_HEIGHT_CM,
  RELATIONSHIP_GOALS,
  RELATIONSHIP_STATUSES,
  SEEKING,
  values,
} from "@/lib/profile-options";

// The profile fields a member can set and later edit. Birthdate is only set at onboarding.
export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Add a first name or nickname.").max(40),
  gender: z.enum(values(GENDERS), { message: "Choose how you describe yourself." }),
  place_id: z.coerce.number({ message: "Choose your location from the list." }).int(),
  seeking: z.array(z.enum(values(SEEKING))).min(1, "Choose who you’d like to meet."),
  relationship_status: z.enum(values(RELATIONSHIP_STATUSES), { message: "Choose your relationship status." }),
  relationship_goals: z.array(z.enum(values(RELATIONSHIP_GOALS))).min(1, "Choose what kind of relationship you want."),
  height_cm: z.coerce
    .number({ message: "Choose your height." })
    .int()
    .min(MIN_HEIGHT_CM, "Choose your height.")
    .max(MAX_HEIGHT_CM, "Choose your height."),
  body_type: z.enum(values(BODY_TYPES), { message: "Choose your body type." }),
  hair_colour: z.enum(values(HAIR_COLOURS), { message: "Choose your hair colour." }),
  ethnicity: z.enum(values(ETHNICITIES), { message: "Choose your ethnicity, or prefer not to say." }),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().min(20, "Tell people a little about yourself (at least 20 characters).").max(1200),
  looking_for: z.string().trim().max(800).optional(),
});

// Reads the profile fields out of submitted form data in one place.
export function profileInput(formData: FormData) {
  return {
    display_name: formData.get("display_name"),
    gender: formData.get("gender"),
    place_id: formData.get("place_id"),
    seeking: formData.getAll("seeking"),
    relationship_status: formData.get("relationship_status"),
    relationship_goals: formData.getAll("relationship_goals"),
    height_cm: formData.get("height_cm"),
    body_type: formData.get("body_type"),
    hair_colour: formData.get("hair_colour"),
    ethnicity: formData.get("ethnicity"),
    headline: formData.get("headline") || undefined,
    bio: formData.get("bio"),
    looking_for: formData.get("looking_for") || undefined,
  };
}
