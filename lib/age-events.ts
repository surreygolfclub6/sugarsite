import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// started, passed, or why it didn't pass: cancelled, state, unavailable, not_verified, too_young, low_assurance, expired, used.
export type AgeOutcome = string;

export const OUTCOME_LABELS: Record<string, string> = {
  started: "Started",
  passed: "Passed",
  cancelled: "Cancelled or closed",
  state: "Started in another browser",
  unavailable: "Service error",
  not_verified: "Not verified",
  too_young: "Under 18",
  low_assurance: "Method too weak",
  expired: "Expired",
  used: "Already used on another account",
};

// Records one step and returns a short reference the member can quote to support. Never throws: logging must not break the check.
export async function logAgeEvent(userId: string, outcome: AgeOutcome, detail?: Record<string, unknown>): Promise<string | null> {
  try {
    const { data } = await createAdminClient().from("age_check_events").insert({ user_id: userId, outcome, detail: detail ?? null }).select("id").single();
    return data?.id ? data.id.slice(0, 8) : null;
  } catch {
    return null;
  }
}
