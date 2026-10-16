export function ageFrom(birthdate: string) {
  const dob = new Date(`${birthdate}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const before =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (before) age -= 1;
  return age;
}

// "Online" means active in the last ten minutes (activity is recorded by server code, see lib/activity.ts).
export const isOnline = (lastActiveAt: string | null) =>
  lastActiveAt ? Date.now() - new Date(lastActiveAt).getTime() < 10 * 60 * 1000 : false;

// Coarse on purpose: "30 min ago", never a timestamp.
export function lastActiveText(lastActiveAt: string | null) {
  if (!lastActiveAt) return "A while ago";
  const minutes = Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 60000);
  if (minutes < 10) return "Online now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} ${days === 1 ? "day" : "days"} ago` : "Over a week ago";
}

export function formatHeight(cm: number) {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}'${inches % 12}" (${cm} cm)`;
}

// For the conversation list: "now", "5m", "3h", "Yesterday", or "15 Oct".
export function shortTime(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  if (hours < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
