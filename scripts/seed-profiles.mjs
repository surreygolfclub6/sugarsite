// Creates a handful of demo members, clearly labelled as test accounts (name starts with "Test", headline with "[Test account]"), so Discover has something to search.
//   node scripts/seed-profiles.mjs            replace any existing demo members with a fresh set
//   node scripts/seed-profiles.mjs --remove   delete every demo member (accounts, photos, files)
// Demo accounts use @seed.ardor-test.dev emails with random passwords nobody knows.
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

nextEnv.loadEnvConfig(process.cwd());
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const DOMAIN = "seed.ardor-test.dev";
const COUNT = 10;

// Deterministic, so reruns give the same people.
let seed = 20261015;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const weighted = (pairs) => {
  const total = pairs.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) if ((r -= w) < 0) return v;
  return pairs[0][0];
};
const some = (list, min, max) => {
  const copy = [...list].sort(() => rand() - 0.5);
  return copy.slice(0, int(min, max));
};

// Two clusters (Essex and Hampshire/Thames Valley) so distance filters have something to do,
// plus the big cities for "anywhere in the UK".
const CITIES = [
  ["Colchester", 7], ["Chelmsford", 5], ["Ipswich", 3], ["Southend-on-Sea", 3], ["Cambridge", 3], ["London", 6],
  ["Basingstoke", 6], ["Winchester", 3], ["Southampton", 4], ["Reading", 4], ["Guildford", 3], ["Oxford", 3],
  ["Portsmouth", 3], ["Brighton", 3], ["Bristol", 2], ["Birmingham", 2], ["Manchester", 2], ["Leeds", 1],
  ["Newcastle upon Tyne", 1], ["Edinburgh", 1], ["Glasgow", 1], ["Cardiff", 1], ["Belfast", 1], ["Norwich", 1],
];
const NAMES = {
  woman: ["Amelia", "Chloe", "Daisy", "Eleanor", "Freya", "Grace", "Hannah", "Isla", "Jess", "Katie", "Lucy", "Megan", "Nadia", "Olivia", "Priya", "Rachel", "Sophie", "Tara", "Zoe", "Aisha", "Beth", "Carys", "Imogen", "Leah"],
  man: ["Adam", "Ben", "Callum", "Dan", "Ethan", "Finn", "George", "Harry", "Ian", "Jack", "Kieran", "Liam", "Matt", "Nathan", "Owen", "Raj", "Sam", "Tom", "Will", "Yusuf", "Craig", "Dev", "Joe", "Marcus"],
  "non-binary": ["Alex", "Bailey", "Charlie", "Drew", "Eden", "Frankie", "Jordan", "Kai", "Morgan", "Robin", "Sasha", "Taylor"],
};
const GOALS = ["casual", "no_strings", "long_term", "marriage", "friendship", "not_sure"];
const BODY = ["slim", "athletic", "average", "curvy", "muscular", "few_extra", "plus_size"];
const ETHNIC = [["white", 10], ["asian", 3], ["black", 3], ["mixed", 2], ["middle_eastern", 1], ["hispanic", 1], ["other", 1], ["prefer_not_to_say", 1]];
const STATUS = [["single", 12], ["divorced", 4], ["separated", 2], ["widowed", 1], ["complicated", 1], ["open", 1]];
const HEADLINES = [
  "Always up for a walk and a pub lunch", "Cook, runner, terrible singer", "Looking for someone who laughs easily",
  "Weekends away and Sunday roasts", "New to the area, old to the jokes", "Dog person. Sorry, cat people.",
  "Here for something real", "Gym at six, brunch at ten", "Quiet nights in, loud nights out", "Travel stories wanted",
];
const BIOS = [
  "I work in {job}, spend weekends outdoors and have strong opinions about coffee.",
  "Born and raised nearby. I love live music, a good book and a long lunch with friends.",
  "Between work in {job} and the gym I try to fit in a bit of travel. Always planning the next trip.",
  "Family means a lot to me. I like cooking for people and I make a decent lasagne.",
  "I’m easy-going, a bit competitive at board games, and happiest near the sea.",
  "Recently moved here for work in {job}. Looking to meet people and find the good pubs.",
];
const JOBS = ["teaching", "healthcare", "IT", "construction", "finance", "hospitality", "design", "the civil service", "engineering", "retail"];
const LOOKING = [
  "Someone kind, honest and up for adventures.", "A partner to build something with, no games.",
  "Good company and good conversation, then we’ll see.", "Open to where it goes, as long as we’re both clear about it.",
];

async function removeDemo() {
  let page = 1;
  const doomed = [];
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    doomed.push(...data.users.filter((u) => u.email?.endsWith(`@${DOMAIN}`)));
    if (data.users.length < 1000) break;
    page += 1;
  }
  for (const u of doomed) {
    const { data: files } = await admin.storage.from("photos").list(u.id);
    if (files?.length) await admin.storage.from("photos").remove(files.map((f) => `${u.id}/${f.name}`));
    await admin.auth.admin.deleteUser(u.id);
  }
  console.log(`Removed ${doomed.length} demo members.`);
}

// Each photo is a different composition so a gallery visibly changes as you swipe.
async function avatar(name, hue, n, total) {
  const h = (hue + n * 47) % 360;
  const shapes = [
    `<circle cx="470" cy="210" r="130" fill="rgba(255,255,255,0.12)"/>`,
    `<rect x="60" y="120" width="200" height="320" rx="30" fill="rgba(255,255,255,0.10)"/>`,
    `<circle cx="140" cy="640" r="170" fill="rgba(0,0,0,0.18)"/>`,
    `<rect x="300" y="480" width="260" height="200" rx="24" fill="rgba(255,255,255,0.10)"/>`,
    `<circle cx="300" cy="150" r="90" fill="rgba(255,255,255,0.14)"/>`,
    `<rect x="40" y="560" width="520" height="90" rx="45" fill="rgba(0,0,0,0.16)"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">
    <defs><linearGradient id="g" x1="${n % 2}" y1="0" x2="${(n + 1) % 2}" y2="1">
      <stop offset="0" stop-color="hsl(${h},55%,42%)"/><stop offset="1" stop-color="hsl(${(h + 50) % 360},60%,22%)"/>
    </linearGradient></defs>
    <rect width="800" height="1000" fill="url(#g)"/>
    <g transform="scale(1.33,1.25)">${shapes[n % shapes.length]}${shapes[(n + 3) % shapes.length]}</g>
    <text x="400" y="590" font-size="340" font-family="sans-serif" fill="rgba(255,255,255,0.85)" text-anchor="middle">${name[0]}</text>
    <text x="400" y="930" font-size="34" font-family="sans-serif" fill="rgba(255,255,255,0.75)" text-anchor="middle">Demo profile · photo ${n + 1} of ${total}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

await removeDemo();
if (process.argv.includes("--remove")) process.exit(0);

const places = new Map();
for (const [name] of CITIES) {
  const { data } = await admin.from("uk_places").select("id, name, county, nation").eq("name", name).order("population", { ascending: false }).limit(1).single();
  places.set(name, data);
}

const usedNames = new Set();
let made = 0;
for (let i = 0; i < COUNT; i++) {
  const gender = i < 6 ? "non-binary" : weighted([["woman", 5], ["man", 5]]);
  let name;
  do name = pick(NAMES[gender]); while (usedNames.has(name) && usedNames.size < 60 && rand() < 0.8);
  usedNames.add(name);

  const orientation = rand();
  const seeking =
    gender === "non-binary"
      ? pick([["man", "woman", "non-binary"], ["non-binary"], ["woman"], ["man"]])
      : orientation < 0.82
        ? [gender === "woman" ? "man" : "woman"]
        : orientation < 0.92
          ? [gender]
          : ["man", "woman"];

  const place = places.get(weighted(CITIES));
  const age = i % 10 === 0 ? int(55, 64) : weighted([[int(22, 29), 4], [int(30, 39), 5], [int(40, 49), 3], [int(50, 62), 2]]);
  const now = new Date();
  const birthdate = `${now.getFullYear() - age - (rand() < 0.5 ? 1 : 0)}-${String(int(1, 12)).padStart(2, "0")}-${String(int(1, 28)).padStart(2, "0")}`;
  const height = gender === "woman" ? int(152, 180) : gender === "man" ? int(165, 196) : int(155, 190);
  const goals = some(GOALS, 1, 3);
  const photoState = weighted([["approved", 15], ["none", 3], ["pending", 2]]);

  const { data: created, error } = await admin.auth.admin.createUser({
    email: `seed-${String(i + 1).padStart(2, "0")}@${DOMAIN}`,
    password: randomUUID(),
    email_confirm: true,
  });
  if (error) throw error;
  const id = created.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      display_name: `Test ${name}`,
      birthdate,
      gender,
      seeking,
      place_id: place.id,
      city: `${place.name}, ${place.county && place.county !== place.name ? place.county : place.nation}`,
      relationship_status: weighted(STATUS),
      relationship_goals: goals,
      height_cm: height,
      body_type: pick(BODY),
      hair_colour: weighted([["brown", 5], ["blonde", 3], ["black", 3], ["red", 1], ["grey", age > 45 ? 3 : 0], ["white", age > 58 ? 2 : 0], ["bald", gender === "man" ? 1 : 0], ["other", 1]].filter(([, w]) => w > 0)),
      ethnicity: weighted(ETHNIC),
      headline: `[Test account] ${pick(HEADLINES)}`.slice(0, 120),
      bio: pick(BIOS).replace("{job}", pick(JOBS)),
      looking_for: rand() < 0.7 ? pick(LOOKING) : null,
      status: "active",
    })
    .eq("id", id);
  if (profileError) throw profileError;

  if (photoState !== "none") {
    // Approved members have 1 to 6 photos, so galleries and photo-count badges vary.
    const total = photoState === "approved" ? weighted([[1, 1], [2, 2], [3, 3], [4, 3], [5, 2], [6, 1]]) : int(1, 2);
    const hue = int(0, 359);
    for (let n = 0; n < total; n++) {
      const path = `${id}/demo-${n + 1}.jpg`;
      await admin.storage.from("photos").upload(path, await avatar(name, hue, n, total), { contentType: "image/jpeg" });
      const { error: photoError } = await admin.from("photos").insert({ user_id: id, storage_path: path, moderation: photoState, position: n });
      if (photoError) throw photoError;
    }
  }
  made += 1;
  process.stdout.write(`\r${made} / ${COUNT}`);
}
console.log("\nDone. Remove them any time with: node scripts/seed-profiles.mjs --remove");
