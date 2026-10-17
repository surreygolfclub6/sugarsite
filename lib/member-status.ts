// Where a member whose profile isn't live yet belongs. Null means they can use the app.
export function setupPath(status: string | null | undefined): string | null {
  if (!status || status === "incomplete") return "/onboarding";
  if (status === "pending_review") return "/age-check";
  return null;
}
