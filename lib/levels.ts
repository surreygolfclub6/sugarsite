// The four levels, as members see them. The numbers here mirror the tier_rules table in the database, which is what
// actually enforces them; scripts/check-levels.mjs compares the two so the pages can't drift from the rules.
// Kept free of imports so that script can load it.

export type TierKey = "newcomer" | "member" | "trusted" | "champion";

export type Level = {
  tier: TierKey;
  label: string;
  tagline: string;
  conversationsPerDay: number;
  likesPerHour: number;
  minReplies: number;
  minFriends: number;
  needsPhotoAndProfile: boolean;
  how: string;
};

export const LEVELS: Level[] = [
  {
    tier: "newcomer",
    label: "Newcomer",
    tagline: "Everyone starts here.",
    conversationsPerDay: 2,
    likesPerHour: 30,
    minReplies: 0,
    minFriends: 0,
    needsPhotoAndProfile: false,
    how: "Join, pass the age check and get approved. Your first week counts as Member, so you can settle in.",
  },
  {
    tier: "member",
    label: "Member",
    tagline: "A real profile and a real conversation.",
    conversationsPerDay: 5,
    likesPerHour: 80,
    minReplies: 3,
    minFriends: 0,
    needsPhotoAndProfile: true,
    how: "An approved photo, a complete profile, and replies to 3 people.",
  },
  {
    tier: "trusted",
    label: "Trusted",
    tagline: "People who make the community better.",
    conversationsPerDay: 12,
    likesPerHour: 120,
    minReplies: 10,
    minFriends: 1,
    needsPhotoAndProfile: true,
    how: "Everything in Member, replies to 10 people, and 1 invited friend who has become a real member.",
  },
  {
    tier: "champion",
    label: "Champion",
    tagline: "The people who keep SugarMatch thriving.",
    conversationsPerDay: 25,
    likesPerHour: 160,
    minReplies: 25,
    minFriends: 3,
    needsPhotoAndProfile: true,
    how: "Everything in Trusted, replies to 25 people, and 3 invited friends who have become real members.",
  },
];

// What the database returns from my_progress().
export type Progress = {
  tier: TierKey;
  label: string;
  rank: number;
  daily_conversations: number;
  likes_per_hour: number;
  started_today: number;
  in_grace: boolean;
  upheld_reports: number;
  metrics: { has_photo: boolean; profile_ok: boolean; replies: number; referrals_joined: number; referrals_qualified: number };
  next: null | {
    tier: TierKey;
    label: string;
    daily_conversations: number;
    likes_per_hour: number;
    needs_photo: boolean;
    needs_profile: boolean;
    min_replies: number;
    min_referrals: number;
  };
};

// Plain-language definitions shown wherever the levels are explained.
export const DEFINITIONS = {
  completeProfile: "a headline, an “about you” of at least 40 characters, “what I’m looking for” of at least 20, your location and at least one relationship goal",
  reply: "writing back to someone who messaged you first. Each person counts once, over the last 60 days",
  realMember: "someone you invited with your link who has passed the age check, been approved, added a photo, completed their profile and stayed live for 7 days",
};
