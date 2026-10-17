// Checks that the level numbers shown on the pages (lib/levels.ts) match the rules the database enforces (tier_rules).
// Run: node --experimental-strip-types scripts/check-levels.mjs   (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
import { createClient } from "@supabase/supabase-js";
import { LEVELS } from "../lib/levels.ts";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rules, error } = await db.from("tier_rules").select("*").order("rank");
if (error) throw error;

const problems = [];
if (rules.length !== LEVELS.length) problems.push(`database has ${rules.length} levels, pages show ${LEVELS.length}`);
LEVELS.forEach((level, i) => {
  const rule = rules[i];
  if (!rule) return;
  const same = {
    tier: level.tier === rule.tier,
    label: level.label === rule.label,
    conversationsPerDay: level.conversationsPerDay === rule.daily_conversations,
    minConversations: level.minConversations === rule.min_conversations,
    minFriends: level.minFriends === rule.min_referrals,
    needsPhotoAndProfile: level.needsPhotoAndProfile === (rule.needs_photo && rule.needs_profile),
    needsResponseRecord: level.needsResponseRecord === rule.needs_responsive,
  };
  for (const [field, ok] of Object.entries(same)) if (!ok) problems.push(`${level.tier}: ${field} differs`);
});
if (problems.length) {
  console.error("Level numbers are out of step:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log(`All ${LEVELS.length} levels match the database.`);
