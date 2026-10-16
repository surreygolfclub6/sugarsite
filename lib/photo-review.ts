export const REJECTION_REASONS = [
  { value: "not_you", label: "It doesn’t show you" },
  { value: "explicit", label: "Explicit or nude" },
  { value: "inappropriate", label: "Inappropriate or offensive" },
  { value: "low_quality", label: "Too dark, blurry or small" },
  { value: "underage", label: "Appears to show a minor" },
  { value: "other", label: "Doesn’t meet our photo rules" },
] as const;

export const reasonLabel = (value: string | null) =>
  REJECTION_REASONS.find((r) => r.value === value)?.label ?? "Doesn’t meet our photo rules";
