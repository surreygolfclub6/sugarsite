import { expect, test, type Locator, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

loadEnvConfig(process.cwd());

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const password = "correct-horse-battery";
const ids: Record<string, string> = {};

async function place(name: string, county?: string) {
  let q = admin.from("uk_places").select("id").eq("name", name).order("population", { ascending: false }).limit(1);
  if (county) q = q.eq("county", county);
  const { data } = await q.single();
  return data!.id as number;
}

async function member(key: string, profile: Record<string, unknown>) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `e2e-${key}-${stamp}@ardor-test.dev`,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  ids[key] = data.user.id;
  const { error: updateError } = await admin
    .from("profiles")
    .update({ bio: "Created by the Discover test.", status: "active", relationship_goals: ["long_term"], ...profile })
    .eq("id", data.user.id);
  if (updateError) throw updateError;
}

const BULK = 14;

test.beforeAll(async () => {
  test.setTimeout(180_000);
  const colchester = await place("Colchester", "Essex");
  const chelmsford = await place("Chelmsford", "Essex");
  const glasgow = await place("Glasgow");
  // Test members are 200 cm+ and every test starts filtered to that, so demo members never interfere.
  const base = { gender: "man", seeking: ["woman"], place_id: colchester, city: "Colchester, Essex", height_cm: 205 };

  await member("viewer", { display_name: "Viewer", birthdate: "1990-01-01", gender: "woman", seeking: ["man"], place_id: colchester, city: "Colchester, Essex" });
  await member("near", { ...base, display_name: "Near", birthdate: "1988-01-01", place_id: chelmsford, city: "Chelmsford, Essex", height_cm: 210, body_type: "athletic", hair_colour: "brown", relationship_status: "single" });
  await member("nophoto", { ...base, display_name: "Nophoto", birthdate: "1991-06-01", relationship_goals: ["casual"], height_cm: 202, body_type: "slim", hair_colour: "blonde", relationship_status: "divorced" });
  await member("older", { ...base, display_name: "Older", birthdate: "1960-01-01", height_cm: 204, body_type: "average", hair_colour: "grey", relationship_status: "widowed" });
  await member("noplace", { display_name: "Noplace", birthdate: "1990-01-01", gender: "woman", seeking: ["man"], place_id: null, city: "Somewhere" });
  await member("wrong", { ...base, display_name: "Wrong", birthdate: "1988-01-01", seeking: ["man"] });
  await member("far", { ...base, display_name: "Far", birthdate: "1988-01-01", place_id: glasgow, city: "Glasgow" });
  await member("susp", { ...base, display_name: "Susp", birthdate: "1988-01-01", status: "suspended" });

  // Enough extra members that the results span more than one page (12 per page).
  await Promise.all(
    Array.from({ length: BULK }, (_, i) =>
      member(`bulk${i}`, { ...base, display_name: `Bulk${i}`, birthdate: "1989-01-01", height_cm: 213 }),
    ),
  );

  const path = `${ids.near}/approved.jpg`;
  const buffer = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#33aa66" } }).jpeg().toBuffer();
  await admin.storage.from("photos").upload(path, buffer, { contentType: "image/jpeg" });
  await admin.from("photos").insert({ user_id: ids.near, storage_path: path, moderation: "approved", position: 0 });
  for (const n of [1, 2]) {
    const extra = `${ids.near}/approved-${n}.jpg`;
    const shot = await sharp({ create: { width: 300, height: 400, channels: 3, background: n === 1 ? "#aa6633" : "#6633aa" } }).jpeg().toBuffer();
    await admin.storage.from("photos").upload(extra, shot, { contentType: "image/jpeg" });
    await admin.from("photos").insert({ user_id: ids.near, storage_path: extra, moderation: "approved", position: n });
  }
  // A pending photo must never be shown to others.
  const hidden = `${ids.nophoto}/pending.jpg`;
  await admin.storage.from("photos").upload(hidden, buffer, { contentType: "image/jpeg" });
  await admin.from("photos").insert({ user_id: ids.nophoto, storage_path: hidden, moderation: "pending", position: 0 });
});

test.afterAll(async () => {
  for (const id of Object.values(ids)) {
    const { data: files } = await admin.storage.from("photos").list(id);
    if (files?.length) await admin.storage.from("photos").remove(files.map((f) => `${id}/${f.name}`));
    await admin.auth.admin.deleteUser(id);
  }
});

async function setRange(input: Locator, value: number) {
  await input.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

async function signIn(page: Page, key: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`e2e-${key}-${stamp}@ardor-test.dev`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover/);
}

const card = (page: Page, name: string) => page.locator(`[data-card="${ids[name]}"]`);
// Named test members are 200 to 212 cm and the bulk members 213 cm (no demo member is over 191),
// so searches start filtered to one group and demo members never interfere.
const TESTERS = "height_min=200&height_max=212";
const BULK_ONLY = "height_min=213";

async function chooseOnly(page: Page, label: string, options: string[]) {
  await page.getByRole("button", { name: new RegExp(`^${label}:`) }).click();
  const group = page.getByRole("group", { name: label });
  await group.getByLabel("Select all").uncheck();
  for (const o of options) await group.getByLabel(o, { exact: true }).check();
  await page.keyboard.press("Escape");
}

test("results show mutually matching, active members with approved photos only", async ({ page }) => {
  await signIn(page, "viewer");
  await page.goto(`/discover?${TESTERS}`);

  await expect(card(page, "near")).toBeVisible();
  await expect(card(page, "nophoto")).toBeVisible();
  await expect(card(page, "older")).toBeVisible();
  await expect(card(page, "wrong")).toHaveCount(0);
  await expect(card(page, "far")).toHaveCount(0);
  await expect(card(page, "susp")).toHaveCount(0);

  await expect(card(page, "near").getByRole("img", { name: "Near’s photo" })).toBeVisible();
  await expect(card(page, "nophoto").getByRole("img", { name: "Photo coming soon" })).toBeVisible();
  await expect(card(page, "nophoto").locator("img")).toHaveCount(0);
});

test("results sit two to a row, fill the width, have no logo header, and more load as you scroll", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 900 });
  await signIn(page, "viewer");
  await page.goto(`/discover?${BULK_ONLY}`);
  const cards = page.locator("[data-card]");

  // First page: 12 profiles, two side by side.
  await expect(cards).toHaveCount(12);
  const a = (await cards.nth(0).boundingBox())!;
  const b = (await cards.nth(1).boundingBox())!;
  const c = (await cards.nth(2).boundingBox())!;
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(b.x).toBeGreaterThan(a.x + a.width - 1);
  expect(c.y).toBeGreaterThan(a.y + a.height - 1);

  // The tiles use nearly the whole screen width and there's no brand header above the title.
  expect(a.x).toBeLessThan(14);
  expect(b.x + b.width).toBeGreaterThan(412 - 14);
  await expect(page.getByRole("link", { name: "SugarMatch" })).toHaveCount(0);
  expect((await page.getByRole("heading", { name: "Search", exact: true }).boundingBox())!.y).toBeLessThan(40);

  // Scrolling brings in the rest.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(cards).toHaveCount(BULK);
  await expect(page.getByText("That’s everyone for now.")).toBeVisible();

  const shown = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-card")));
  expect(new Set(shown).size).toBe(shown.length);
});

test("wider screens put more tiles on each row", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "viewer");
  await page.goto(`/discover?${BULK_ONLY}`);
  const cards = page.locator("[data-card]");
  await expect(cards).toHaveCount(12);
  const ys = await cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(ys.filter((y) => y === ys[0])).toHaveLength(4);
});

test("search form: sliders narrow by age, height and distance, then Edit search keeps them", async ({ page }) => {
  await signIn(page, "viewer");
  await page.goto(`/discover/filters?${TESTERS}`);
  await expect(page.getByRole("heading", { name: "Search filters" })).toBeVisible();

  await setRange(page.getByLabel("Maximum age"), 40);
  await setRange(page.getByLabel("Minimum height"), 206);
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();
  await expect(card(page, "older")).toHaveCount(0);
  await expect(card(page, "nophoto")).toHaveCount(0);
  await expect(card(page, "near")).toBeVisible();

  // Edit search returns to the form with everything still set.
  await page.getByRole("link", { name: "Edit search" }).click();
  await expect(page).toHaveURL(/\/discover\/filters$/);
  await expect(page.getByLabel("Maximum age")).toHaveValue("40");
  await expect(page.getByLabel("Minimum height")).toHaveValue("206");

  // Distance defaults to 50 miles; the far end means anywhere in the UK.
  await setRange(page.getByLabel("Minimum height"), 200);
  await setRange(page.getByLabel("Maximum age"), 99);
  await expect(page.getByLabel("Maximum height")).toHaveValue("212");
  await expect(page.getByLabel("Distance")).toHaveValue("50");
  await setRange(page.getByLabel("Distance"), 300);
  await expect(page.getByText("Anywhere in the UK")).toBeVisible();
  await page.getByRole("button", { name: "Search" }).click();
  await expect(card(page, "far")).toBeVisible();
});

test("filters are remembered between visits until they are reset", async ({ page }) => {
  await signIn(page, "viewer");
  await page.goto(`/discover/filters?${TESTERS}`);
  await setRange(page.getByLabel("Maximum age"), 40);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(card(page, "older")).toHaveCount(0);

  // Leave and come back with a bare address: the same filters apply, and the button shows they're on.
  await page.goto("/interests");
  await page.goto("/discover");
  await expect(card(page, "older")).toHaveCount(0);
  await page.getByRole("link", { name: "Edit search (filters on)" }).click();
  await expect(page.getByLabel("Maximum age")).toHaveValue("40");

  // Reset is the only thing that clears them.
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByLabel("Maximum age")).toHaveValue("99");
  await page.goto("/discover");
  await expect(page.getByRole("link", { name: "Edit search", exact: true })).toBeVisible();
});

test("dropdown filters allow several choices, with a select all", async ({ page }) => {
  await signIn(page, "viewer");
  await page.goto(`/discover/filters?${TESTERS}`);
  const goals = page.getByRole("button", { name: /^They’re looking for:/ });

  // Everything is selected to begin with, and Select all clears or restores the group.
  await expect(goals).toHaveAccessibleName("They’re looking for: All");
  await goals.click();
  const group = page.getByRole("group", { name: "They’re looking for" });
  await group.getByLabel("Select all").uncheck();
  await expect(goals).toHaveAccessibleName("They’re looking for: Any");
  await group.getByLabel("Select all").check();
  await expect(goals).toHaveAccessibleName("They’re looking for: All");
  await expect(group.getByLabel("Casual dating")).toBeChecked();

  // Choose several, search, and only those match (any within a group).
  await group.getByLabel("Select all").uncheck();
  await group.getByLabel("Casual dating").check();
  await expect(goals).toHaveAccessibleName("They’re looking for: Casual dating");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(card(page, "nophoto")).toBeVisible();
  await expect(card(page, "near")).toHaveCount(0);

  // Come back, the choice is remembered; add another goal.
  await page.getByRole("link", { name: "Edit search" }).click();
  await expect(page.getByRole("button", { name: /^They’re looking for:/ })).toHaveAccessibleName("They’re looking for: Casual dating");
  await chooseOnly(page, "They’re looking for", ["Casual dating", "Long-term relationship"]);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(card(page, "nophoto")).toBeVisible();
  await expect(card(page, "near")).toBeVisible();

  // Attribute dropdowns combine with AND between groups, OR within.
  await page.getByRole("link", { name: "Edit search" }).click();
  await chooseOnly(page, "Body type", ["Athletic", "Slim"]);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(card(page, "near")).toBeVisible();
  await expect(card(page, "nophoto")).toBeVisible();
  await expect(card(page, "older")).toHaveCount(0);

  await page.getByRole("link", { name: "Edit search" }).click();
  await chooseOnly(page, "Hair colour", ["Blonde"]);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(card(page, "nophoto")).toBeVisible();
  await expect(card(page, "near")).toHaveCount(0);

  await page.getByRole("link", { name: "Edit search" }).click();
  await chooseOnly(page, "Relationship status", ["Divorced", "Widowed"]);
  await chooseOnly(page, "Hair colour", ["Blonde", "Brown", "Grey"]);
  await chooseOnly(page, "Body type", ["Athletic", "Slim", "Average"]);
  await chooseOnly(page, "They’re looking for", ["Casual dating", "Long-term relationship"]);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(card(page, "nophoto")).toBeVisible();
  await expect(card(page, "older")).toBeVisible();
  await expect(card(page, "near")).toHaveCount(0);
});

test("search area can be somewhere other than your own", async ({ page }) => {
  await signIn(page, "viewer");
  await page.goto(`/discover/filters?${TESTERS}`);

  await page.getByLabel("Somewhere else").check();
  await page.getByLabel("Town or city").fill("Glasg");
  await page.getByRole("option", { name: /^Glasgow/ }).first().click();
  await page.getByRole("button", { name: "Search" }).click();

  await expect(card(page, "far")).toBeVisible();
  await expect(card(page, "near")).toHaveCount(0);

  await page.getByRole("link", { name: "Edit search" }).click();
  await expect(page.getByLabel("Town or city")).toHaveValue(/^Glasgow/);

  // Back to your own area.
  await page.getByLabel(/^My area/).check();
  await page.getByRole("button", { name: "Search" }).click();
  await expect(card(page, "near")).toBeVisible();
  await expect(card(page, "far")).toHaveCount(0);
});

test("likes update straight away and persist", async ({ page }) => {
  await signIn(page, "viewer");
  await page.goto(`/discover?${TESTERS}&miles=300`);
  const heart = card(page, "far").getByRole("button", { name: "Like Far" });

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await admin.from("likes").select("to_user").eq("from_user", ids.viewer)).data).toEqual([{ to_user: ids.far }]);

  await page.reload();
  await expect(card(page, "far").getByRole("button", { name: "Like Far" })).toHaveAttribute("aria-pressed", "true");
  await card(page, "far").getByRole("button", { name: "Like Far" }).click();
  await expect(card(page, "far").getByRole("button", { name: "Like Far" })).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => (await admin.from("likes").select("to_user").eq("from_user", ids.viewer)).data).toEqual([]);
});

test("a member with no location can set one and then sees distances on profiles", async ({ page }) => {
  await signIn(page, "noplace");

  await expect(page.getByRole("form", { name: "Set your location" })).toBeVisible();
  await page.getByRole("combobox", { name: "Your location" }).fill("Colch");
  await page.getByRole("option", { name: "Colchester, Essex" }).click();
  await page.getByRole("button", { name: "Save location" }).click();
  await expect(page.getByRole("form", { name: "Set your location" })).toHaveCount(0);

  await page.goto(`/discover?${TESTERS}`);
  await card(page, "near").getByRole("link").click();
  await expect(page.getByText(/within \d+ miles/)).toBeVisible();
  const { data } = await admin.from("profiles").select("city, place_id").eq("id", ids.noplace).single();
  expect(data).toEqual({ city: "Colchester, Essex", place_id: 2652618 });
});

test("sort tabs order by nearest, recently active and newest, and online members get a dot", async ({ page }) => {
  await admin.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", ids.nophoto);
  await admin.from("profiles").update({ last_active_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() }).eq("id", ids.near);
  await admin.from("profiles").update({ last_active_at: null }).eq("id", ids.older);

  await signIn(page, "viewer");
  const order = async () => {
    const found = await page.locator("[data-card]").evaluateAll((els) => els.map((e) => e.getAttribute("data-card")));
    return found.map((id) => Object.keys(ids).find((k) => ids[k] === id));
  };
  const tab = (name: string) => page.getByRole("navigation", { name: "Sort" }).getByRole("link", { name });

  await page.goto(`/discover?${TESTERS}`);
  await expect(tab("Nearest")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("[data-card]")).toHaveCount(3);
  expect(await order()).toEqual(["older", "nophoto", "near"]);

  await tab("Recently active").click();
  await expect(tab("Recently active")).toHaveAttribute("aria-current", "page");
  await expect.poll(order).toEqual(["nophoto", "near", "older"]);

  await tab("Newest").click();
  await expect.poll(order).toEqual(["older", "nophoto", "near"]);

  // Only the member active in the last ten minutes shows the green dot.
  await expect(card(page, "nophoto").getByRole("img", { name: "Online now" })).toBeVisible();
  await expect(card(page, "near").getByRole("img", { name: "Online now" })).toHaveCount(0);
  await expect(card(page, "older").getByRole("img", { name: "Online now" })).toHaveCount(0);
});

test("tiles are small, a tile opens the full profile with a swipeable gallery, and hidden profiles 404", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 900 });
  await signIn(page, "viewer");
  await page.goto(`/discover?${TESTERS}`);

  // The tile carries little: photo, name, age and town. The detail lives on the profile page.
  await expect(card(page, "near")).toContainText("Near");
  await expect(card(page, "near")).toContainText("38 · Chelmsford, Essex");
  await expect(card(page, "near")).not.toContainText("Athletic");
  await expect(card(page, "near").getByLabel("3 photos")).toBeVisible();

  await card(page, "near").getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/profile/${ids.near}`));
  await expect(page.getByRole("heading", { name: "Near, 38" })).toBeVisible();

  // The tabs step aside for a fixed Message bar.
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Message" })).toBeEnabled();

  // Gallery: one photo per swipe, dots follow along.
  const photos = page.getByRole("list", { name: "Photos" });
  await expect(photos.getByRole("img")).toHaveCount(3);
  await expect(page.getByText("Photo 1 of 3")).toBeAttached();
  await expect(page.locator('[data-dot="active"]')).toHaveCount(1);
  await photos.evaluate((el) => el.scrollTo({ left: el.clientWidth * 2 }));
  await expect(page.getByText("Photo 3 of 3")).toBeAttached();
  await expect(page.locator("[data-dot]").nth(2)).toHaveAttribute("data-dot", "active");

  // Details sit in cards below.
  await expect(page.getByText(/within \d+ miles/)).toBeVisible();
  await expect(page.getByText("Created by the Discover test.")).toBeVisible();
  await expect(page.getByText("Athletic")).toBeVisible();
  await expect(page.getByText("6'11\" (210 cm)")).toBeVisible();
  await expect(page.getByText("Near liked you")).toBeVisible();

  const like = page.getByRole("button", { name: "Like Near" });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await admin.from("likes").select("to_user").eq("from_user", ids.viewer)).data).toEqual([{ to_user: ids.near }]);
  await admin.from("likes").delete().eq("from_user", ids.viewer);

  // The back button returns to where you came from.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/discover\?/);

  // Suspended members, and made-up ids, look like any other missing page.
  for (const missing of [ids.susp, "00000000-0000-4000-8000-000000000000", "not-an-id"]) {
    await page.goto(`/profile/${missing}`);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  }
});

test("interests lists who liked you and who you liked, and the bottom bar navigates", async ({ page }) => {
  await admin.from("likes").insert([
    { from_user: ids.viewer, to_user: ids.near },
    { from_user: ids.older, to_user: ids.viewer },
  ]);
  await signIn(page, "viewer");

  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Search" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Messages" })).toBeVisible();

  await nav.getByRole("link", { name: "Interests" }).click();
  await expect(page).toHaveURL(/\/interests/);
  await expect(page.getByRole("heading", { name: "Interests" })).toBeVisible();
  await expect(card(page, "older")).toBeVisible();
  await expect(card(page, "older").getByRole("button", { name: "Like Older" })).toHaveAttribute("aria-pressed", "false");
  await expect(card(page, "near")).toHaveCount(0);

  await page.getByRole("link", { name: "You liked" }).click();
  await expect(card(page, "near")).toBeVisible();
  await expect(card(page, "near").getByRole("button", { name: "Like Near" })).toHaveAttribute("aria-pressed", "true");
  await expect(card(page, "older")).toHaveCount(0);

  await nav.getByRole("link", { name: "More" }).click();
  await expect(page).toHaveURL(/\/more/);
  await expect(page.getByRole("link", { name: "Your photos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Search filters" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Photo review/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});
