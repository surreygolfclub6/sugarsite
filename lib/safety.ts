// Report reasons. Values must match the check constraint on reports.reason.
export const REPORT_REASONS = [
  { value: "fake_profile", label: "Fake profile" },
  { value: "scam", label: "Scam or fraud" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "underage", label: "Appears to be under 18" },
  { value: "solicitation", label: "Asking for or offering payment for sex" },
  { value: "other", label: "Something else" },
] as const;

export const reportReasonLabel = (value: string) => REPORT_REASONS.find((r) => r.value === value)?.label ?? value;
