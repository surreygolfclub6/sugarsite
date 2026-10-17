// The four levels, as members see them. The numbers here mirror the tier_rules table in the database, which is what
// actually enforces them; scripts/check-levels.mjs compares the two so the pages can't drift from the rules.
// Kept free of imports so that script can load it.

export type TierKey = "newcomer" | "member" | "trusted" | "champion";

export type Level = {
  tier: TierKey;
  label: string;
  tagline: string;
  conversationsPerDay: number;
  minConversations: number;
  minFriends: number;
  needsPhotoAndProfile: boolean;
  needsResponseRecord: boolean;
  how: string;
};

export const LEVELS: Level[] = [
  {
    tier: "newcomer",
    label: "Newcomer",
    tagline: "Everyone starts here.",
    conversationsPerDay: 2,
    minConversations: 0,
    minFriends: 0,
    needsPhotoAndProfile: false,
    needsResponseRecord: false,
    how: "Join, pass the age check and get approved. Your first week counts as Member, so you can settle in.",
  },
  {
    tier: "member",
    label: "Member",
    tagline: "A real profile and real conversations.",
    conversationsPerDay: 5,
    minConversations: 3,
    minFriends: 0,
    needsPhotoAndProfile: true,
    needsResponseRecord: false,
    how: "An approved photo (public or private), a complete profile, and 3 conversations.",
  },
  {
    tier: "trusted",
    label: "Trusted",
    tagline: "People who make the community better.",
    conversationsPerDay: 12,
    minConversations: 10,
    minFriends: 1,
    needsPhotoAndProfile: true,
    needsResponseRecord: true,
    how: "Everything in Member, 10 conversations, 1 invited friend who has become a real member, and a good response record.",
  },
  {
    tier: "champion",
    label: "Champion",
    tagline: "The people who keep SugarMatch thriving.",
    conversationsPerDay: 25,
    minConversations: 25,
    minFriends: 3,
    needsPhotoAndProfile: true,
    needsResponseRecord: true,
    how: "Everything in Trusted, 25 conversations, and 3 invited friends who have become real members.",
  },
];

// What every level gets, in plain words. The same lines appear wherever levels are explained.
export function whatYouGet(level: Level): string[] {
  return [
    `${level.conversationsPerDay} new conversations a day`,
    "Replying and messaging a match: always unlimited",
    `A ${level.label} badge on your profile`,
  ];
}

// What the database returns from my_progress().
export type Progress = {
  tier: TierKey;
  label: string;
  rank: number;
  daily_conversations: number;
  started_today: number;
  in_grace: boolean;
  upheld_reports: number;
  matches: number;
  metrics: {
    has_photo: boolean;
    profile_ok: boolean;
    conversations: number;
    responsive: boolean;
    referrals_joined: number;
    referrals_qualified: number;
  };
  next: null | {
    tier: TierKey;
    label: string;
    daily_conversations: number;
    needs_photo: boolean;
    needs_profile: boolean;
    needs_responsive: boolean;
    min_conversations: number;
    min_referrals: number;
  };
};

// Plain-language definitions shown wherever the levels are explained.
export const DEFINITIONS = {
  photo: "any photo a person on our team has approved. It can be public or private, so you’re never held back for keeping your photos to yourself",
  completeProfile: "a headline, an “about you” of at least 40 characters, “what I’m looking for” of at least 20, your location and at least one relationship goal",
  conversation: "a chat where you and the other person have both written in the last 60 days. It counts once per person, and it doesn’t matter who started it",
  responseRecord: "if people write to you first, you answer at least half of them. This only matters once three people have written to you, so you’re never marked down for messages you didn’t get",
  match: "two members who have both liked each other. Messaging a match never uses up your daily new conversations",
  realMember: "someone you invited with your link who has passed the age check, been approved, added a photo, completed their profile and stayed live for 7 days",
};
