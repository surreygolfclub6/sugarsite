// Why a moderator declined a new member. Kept for the audit log; the member only sees that they weren't approved.
export const DECLINE_REASONS = [
  { value: "not_genuine", label: "Doesn’t look genuine" },
  { value: "incomplete", label: "Profile too incomplete" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
] as const;
