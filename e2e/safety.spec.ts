import { expect, test, type Browser, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const password = "correct-horse-battery";
const ids: Record<string, string> = {};
const email = (key: string) => `e2e-safe-${key}-${stamp}@ardor-test.dev`;

async function member(key: string, gender: "woman" | "man", name: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await admin.auth.admin.createUser({ email: email(key), password, email_confirm: true });
  if (error) throw error;
  ids[key] = data.user.id;
  await admin
    .from("profiles")
    .update({
      display_name: name,
      birthdate: "1990-01-01",
      gender,
      seeking: [gender === "woman" ? "man" : "woman"],
      city: "Colchester, Essex",
      place_id: 2652618,
      bio: `Profile of ${name}, created by the safety test.`,
      status: "active",
      height_cm: 207,
      ...extra,
    })
    .eq("id", data.user.id);
}

async function open(browser: Browser, key: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email(key));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  return page;
}

async function conversation(a: string, b: string, lines: [string, string][]) {
  const [user_a, user_b] = ids[a] < ids[b] ? [ids[a], ids[b]] : [ids[b], ids[a]];
  const { data } = await admin.from("conversations").insert({ user_a, user_b }).select("id").single();
  await admin.from("messages").insert(
    lines.map(([from, body], i) => ({
      conversation_id: data!.id,
      sender_id: ids[from],
      body,
      created_at: new Date(Date.now() - (lines.length - i) * 60_000).toISOString(),
    })),
  );
  return data!.id as string;
}

test.beforeAll(async () => {
  test.setTimeout(120_000);
  await Promise.all([
    member("alice", "woman", "Alice"),
    member("bob", "man", "Bob"),
    member("carol", "woman", "Carol"),
    member("dave", "man", "Dave"),
    member("erin", "woman", "Erin"),
    member("frank", "man", "Frank"),
    member("gina", "woman", "Gina"),
    member("kid", "man", "Kid"),
    member("reviewer", "woman", "Reviewer"),
  ]);
  await admin.from("admins").insert({ user_id: ids.reviewer });
});

test.afterAll(async () => {
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
});

test("blocking works both ways, hides the conversation, stops messages, and can be undone", async ({ browser }) => {
  const convId = await conversation("alice", "bob", [["alice", "Hi Bob"], ["bob", "Hi Alice"]]);
  const alice = await open(browser, "alice");

  await alice.goto("/discover?height_min=200&height_max=212");
  await expect(alice.locator(`[data-card="${ids.bob}"]`)).toBeVisible();
  await alice.goto("/messages");
  await expect(alice.locator(`[data-conversation="${convId}"]`)).toBeVisible();

  await alice.goto(`/profile/${ids.bob}`);
  await alice.getByRole("button", { name: "More options for Bob" }).click();
  await alice.getByRole("menuitem", { name: "Block Bob" }).click();
  const dialog = alice.getByRole("dialog", { name: "Block Bob?" });
  await expect(dialog).toContainText("They won’t be told");
  await dialog.getByRole("button", { name: "Block Bob" }).click();

  await expect(alice).toHaveURL(/\/discover\?blocked=Bob/);
  await expect(alice.getByText("You blocked Bob.")).toBeVisible();
  const { data: block } = await admin.from("blocks").select("blocker, blocked, blocked_name").eq("blocker", ids.alice);
  expect(block).toEqual([{ blocker: ids.alice, blocked: ids.bob, blocked_name: "Bob" }]);

  // Alice no longer sees Bob anywhere.
  await alice.goto("/discover?height_min=200&height_max=212");
  await expect(alice.locator(`[data-card="${ids.bob}"]`)).toHaveCount(0);
  await alice.goto(`/profile/${ids.bob}`);
  await expect(alice.getByText("This page could not be found.")).toBeVisible();
  await alice.goto("/messages");
  await expect(alice.locator(`[data-conversation="${convId}"]`)).toHaveCount(0);
  await alice.goto(`/messages/${convId}`);
  await expect(alice.getByText("This page could not be found.")).toBeVisible();

  // And Bob can no longer see Alice, or the chat, or send into it.
  const bob = await open(browser, "bob");
  await bob.goto(`/profile/${ids.alice}`);
  await expect(bob.getByText("This page could not be found.")).toBeVisible();
  await bob.goto("/messages");
  await expect(bob.locator(`[data-conversation="${convId}"]`)).toHaveCount(0);
  const asBob = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  await asBob.auth.signInWithPassword({ email: email("bob"), password });
  const attempt = await asBob.from("messages").insert({ conversation_id: convId, sender_id: ids.bob, body: "Can you hear me?" });
  expect(attempt.error).not.toBeNull();

  // The block list shows who's blocked, and unblocking restores everything.
  await alice.goto("/more");
  await alice.getByRole("link", { name: "Blocked members" }).click();
  await expect(alice.locator(`[data-blocked="${ids.bob}"]`)).toContainText("Bob");
  await alice.getByRole("button", { name: "Unblock Bob" }).click();
  await expect(alice.getByText("You haven’t blocked anyone.")).toBeVisible();

  await alice.goto(`/profile/${ids.bob}`);
  await expect(alice.getByRole("heading", { name: "Bob, 36" })).toBeVisible();
  await alice.goto("/messages");
  await expect(alice.locator(`[data-conversation="${convId}"]`)).toBeVisible();
});

test("reporting from a chat attaches the conversation, can block too, and duplicates are explained", async ({ browser }) => {
  const convId = await conversation("carol", "dave", [["dave", "You are awful"], ["carol", "Please stop"], ["dave", "No"]]);
  const carol = await open(browser, "carol");
  await carol.goto(`/messages/${convId}`);

  await carol.getByRole("button", { name: "More options for Dave" }).click();
  await carol.getByRole("menuitem", { name: "Report Dave" }).click();
  const dialog = carol.getByRole("dialog", { name: "Report Dave" });
  await expect(dialog).toContainText("shares that conversation with our moderators");

  // A reason is required, and "something else" needs a few words.
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByText("Choose a reason.")).toBeVisible();
  await dialog.getByLabel("Something else").check();
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByText("Please tell us a little more")).toBeVisible();

  await dialog.getByLabel("Harassment or abuse").check();
  await dialog.getByLabel("Details (optional)").fill("He keeps sending abusive messages.");
  await expect(dialog.getByLabel("Also block Dave")).toBeChecked();
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByText("Thanks for letting us know")).toBeVisible();
  await expect(dialog).toContainText("Dave has been blocked");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(carol).toHaveURL(/\/discover/);

  const { data: report } = await admin.from("reports").select("*").eq("reporter", ids.carol).single();
  expect(report).toMatchObject({
    reported: ids.dave,
    reason: "harassment",
    details: "He keeps sending abusive messages.",
    source: "message",
    conversation_id: convId,
    status: "open",
  });
  const { data: blocks } = await admin.from("blocks").select("blocked").eq("blocker", ids.carol);
  expect(blocks).toEqual([{ blocked: ids.dave }]);

  // Reporting the same person again while the first report is open is explained, not silently dropped.
  await admin.from("blocks").delete().eq("blocker", ids.carol);
  await carol.goto(`/profile/${ids.dave}`);
  await carol.getByRole("button", { name: "More options for Dave" }).click();
  await carol.getByRole("menuitem", { name: "Report Dave" }).click();
  const again = carol.getByRole("dialog", { name: "Report Dave" });
  await again.getByLabel("Fake profile").check();
  await again.getByRole("button", { name: "Send report" }).click();
  await expect(again.getByText("You’ve already reported this member.")).toBeVisible();
});

test("a profile report without blocking leaves them visible, and you can't report yourself", async ({ browser }) => {
  const erin = await open(browser, "erin");
  await erin.goto(`/profile/${ids.frank}`);
  await erin.getByRole("button", { name: "More options for Frank" }).click();
  await erin.getByRole("menuitem", { name: "Report Frank" }).click();
  const dialog = erin.getByRole("dialog", { name: "Report Frank" });
  await expect(dialog).not.toContainText("shares that conversation");
  await dialog.getByLabel("Scam or fraud").check();
  await dialog.getByLabel("Also block Frank").uncheck();
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByText("Thanks for letting us know")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();

  // Not blocked, so still reachable.
  await expect(erin).toHaveURL(new RegExp(`/profile/${ids.frank}`));
  const { data } = await admin.from("reports").select("source, conversation_id, reason").eq("reporter", ids.erin).single();
  expect(data).toEqual({ source: "profile", conversation_id: null, reason: "scam" });
  expect((await admin.from("blocks").select("blocked").eq("blocker", ids.erin)).data).toEqual([]);

  // No report or block menu on your own profile.
  await erin.goto(`/profile/${ids.erin}`);
  await expect(erin.getByRole("button", { name: /More options/ })).toHaveCount(0);
  const self = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  await self.auth.signInWithPassword({ email: email("erin"), password });
  expect((await self.from("reports").insert({ reporter: ids.erin, reported: ids.erin, reason: "other" })).error).not.toBeNull();
  // Members can't read reports back, only moderators can.
  expect((await self.from("reports").select("id")).data).toEqual([]);
});

test("moderators work the report queue: under-18 reports first, evidence shown, dismiss or suspend", async ({ browser }) => {
  // gina reports the "kid" as possibly under 18; carol's earlier report against dave is also open.
  await admin.from("reports").insert({ reporter: ids.gina, reported: ids.kid, reason: "underage", details: "Says they are in year 11." });

  const stranger = await open(browser, "alice");
  await stranger.goto("/admin/reports");
  await expect(stranger.getByText("This page could not be found.")).toBeVisible();

  const mod = await open(browser, "reviewer");
  await mod.goto("/admin/reports");
  await expect(mod.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  // Forms only submit as server actions once the page has hydrated.
  await mod.waitForLoadState("networkidle");
  await expect(mod.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: /Reports/ })).toHaveAttribute("aria-current", "page");

  const cards = mod.locator("[data-report]");
  const mine = cards.filter({ hasText: /safety test/ });
  await expect(mine).toHaveCount(3);
  await expect(mine.first()).toContainText("Appears to be under 18");

  // Evidence: who reported, the details, the reported profile and the conversation they were in.
  const daves = mine.filter({ hasText: "Harassment or abuse" });
  await expect(daves).toContainText("Reported by Carol");
  await expect(daves).toContainText("He keeps sending abusive messages.");
  await expect(daves).toContainText("from a conversation");
  await expect(daves.getByRole("region", { name: "Conversation" })).toContainText("Dave: You are awful");
  await expect(daves.getByRole("region", { name: "Conversation" })).toContainText("Carol: Please stop");

  // Dismiss the scam report.
  const scam = mine.filter({ hasText: "Scam or fraud" });
  await scam.getByRole("button", { name: "Dismiss" }).click();
  await expect.poll(async () => (await admin.from("reports").select("status").eq("reporter", ids.erin).single()).data).toEqual({ status: "dismissed" });
  await expect(scam).toHaveCount(0);

  // Suspend the under-18 profile: the report is actioned and they disappear from the site.
  const underage = mine.filter({ hasText: "Appears to be under 18" });
  await underage.getByRole("button", { name: "Suspend member" }).click();
  await expect.poll(async () => (await admin.from("reports").select("status").eq("reporter", ids.gina).single()).data).toEqual({ status: "actioned" });
  await expect(underage).toHaveCount(0);
  expect((await admin.from("profiles").select("status").eq("id", ids.kid).single()).data).toEqual({ status: "suspended" });

  const gina = await open(browser, "gina");
  await gina.goto(`/profile/${ids.kid}`);
  await expect(gina.getByText("This page could not be found.")).toBeVisible();

  // Mark actioned without suspending.
  await mine.filter({ hasText: "Harassment or abuse" }).getByRole("button", { name: "Mark actioned" }).click();
  await expect.poll(async () => (await admin.from("reports").select("status").eq("reporter", ids.carol).single()).data).toEqual({ status: "actioned" });
  await expect(mine).toHaveCount(0);
  expect((await admin.from("profiles").select("status").eq("id", ids.dave).single()).data).toEqual({ status: "active" });
});
