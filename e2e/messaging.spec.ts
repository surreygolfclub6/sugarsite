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
const live = { timeout: 15_000 };

async function member(key: string, gender: "woman" | "man", name: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `e2e-msg-${key}-${stamp}@ardor-test.dev`,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  ids[key] = data.user.id;
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      display_name: name,
      birthdate: "1990-01-01",
      gender,
      seeking: [gender === "woman" ? "man" : "woman"],
      city: "Colchester, Essex",
      place_id: 2652618,
      bio: "Created by the messaging test.",
      status: "active",
    })
    .eq("id", data.user.id);
  if (updateError) throw updateError;
}

async function open(browser: Browser, key: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(`e2e-msg-${key}-${stamp}@ardor-test.dev`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  return page;
}

async function conversation(a: string, b: string, messages: { from: string; body: string; ago: number }[]) {
  const [user_a, user_b] = ids[a] < ids[b] ? [ids[a], ids[b]] : [ids[b], ids[a]];
  const { data } = await admin.from("conversations").insert({ user_a, user_b }).select("id").single();
  const rows = messages.map((m) => ({
    conversation_id: data!.id,
    sender_id: ids[m.from],
    body: m.body,
    created_at: new Date(Date.now() - m.ago * 1000).toISOString(),
  }));
  const { error } = await admin.from("messages").insert(rows);
  if (error) throw error;
  return data!.id as string;
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  await Promise.all([
    member("alice", "woman", "Alice"),
    member("bob", "man", "Bob"),
    member("carol", "woman", "Carol"),
    member("hist1", "woman", "Hista"),
    member("hist2", "man", "Histb"),
  ]);
});

test.afterAll(async () => {
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
});

test("two members chat live: delivery, unread badge, read receipts and replies", async ({ browser }) => {
  const alice = await open(browser, "alice");
  const bob = await open(browser, "bob");

  // Bob sits on his (empty) messages tab while Alice starts the conversation.
  await bob.goto("/messages");
  await expect(bob.getByText("No conversations yet.")).toBeVisible();

  await alice.goto(`/profile/${ids.bob}`);
  await alice.getByRole("button", { name: "Message" }).click();
  await expect(alice).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
  await expect(alice.getByText("Say hello to Bob.")).toBeVisible();

  const send = alice.getByRole("button", { name: "Send" });
  await expect(send).toBeDisabled();
  await alice.getByLabel("Write a message").fill("   ");
  await expect(send).toBeDisabled();
  await alice.getByLabel("Write a message").fill("Hello Bob");
  await alice.getByLabel("Write a message").press("Enter");
  await expect(alice.getByRole("log").getByText("Hello Bob")).toBeVisible();
  await expect(alice.locator("[data-receipt]")).toHaveText("Sent", live);

  // Bob sees it arrive without reloading: a row with an unread count, and a badge on the tab.
  const row = bob.locator("[data-conversation]");
  await expect(row).toContainText("Alice", live);
  await expect(row).toContainText("Hello Bob");
  await expect(row.locator("[data-unread]")).toHaveText("1");
  await expect(bob.getByLabel("1 unread messages")).toBeVisible(live);

  // Opening the thread marks it read, and Alice's receipt flips to Read live.
  await row.getByRole("link").click();
  await expect(bob.getByRole("log").getByText("Hello Bob")).toBeVisible();
  await expect(alice.locator("[data-receipt]")).toHaveText("Read", live);
  await expect(bob.getByLabel(/unread messages/)).toHaveCount(0);

  // Bob replies; it appears in Alice's open thread live, and hers reads it straight away.
  await bob.getByLabel("Write a message").fill("Hi Alice, lovely to hear from you");
  await bob.getByRole("button", { name: "Send" }).click();
  await expect(alice.getByRole("log").getByText("Hi Alice, lovely to hear from you")).toBeVisible(live);
  await expect(bob.locator("[data-receipt]")).toHaveText("Read", live);

  // Both messages are saved, in order, and survive a reload.
  await alice.reload();
  const bubbles = alice.locator("[data-message] p");
  await expect(bubbles).toHaveText(["Hello Bob", "Hi Alice, lovely to hear from you"]);
  const { data: saved } = await admin.from("messages").select("body, read_at").order("created_at").in("sender_id", [ids.alice, ids.bob]);
  expect(saved!.map((m) => m.body)).toEqual(["Hello Bob", "Hi Alice, lovely to hear from you"]);
  expect(saved!.every((m) => m.read_at)).toBe(true);

  // The list now leads with Bob's reply, with no unread count.
  await alice.goto("/messages");
  await expect(alice.locator("[data-conversation]")).toContainText("Hi Alice, lovely to hear from you");
  await expect(alice.locator("[data-conversation] [data-unread]")).toHaveCount(0);

  // Message text is never treated as HTML.
  await alice.locator("[data-conversation]").getByRole("link").click();
  await alice.getByLabel("Write a message").fill('<img src=x onerror="window.pwned=1"> <b>bold</b>');
  await alice.getByRole("button", { name: "Send" }).click();
  await expect(alice.getByRole("log").getByText('<img src=x onerror="window.pwned=1"> <b>bold</b>')).toBeVisible();
  await expect(alice.getByRole("log").locator("img, b")).toHaveCount(0);
  expect(await alice.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined();

  // Strangers can't read the thread.
  const carol = await open(browser, "carol");
  const { data: conv } = await admin.from("conversations").select("id").limit(1).or(`user_a.eq.${ids.alice},user_b.eq.${ids.alice}`).single();
  await carol.goto(`/messages/${conv!.id}`);
  await expect(carol.getByText("This page could not be found.")).toBeVisible();
});

test("long conversations load in pages, and a suspended member's chat disappears", async ({ browser }) => {
  const messages = Array.from({ length: 35 }, (_, i) => ({
    from: i % 2 ? "hist2" : "hist1",
    body: `Message number ${i + 1}`,
    ago: (36 - i) * 60,
  }));
  const id = await conversation("hist1", "hist2", messages);

  const page = await open(browser, "hist1");
  await page.goto(`/messages/${id}`);
  const bubbles = page.locator("[data-message] p");
  await expect(bubbles).toHaveCount(30);
  await expect(bubbles.last()).toHaveText("Message number 35");
  await expect(bubbles.first()).toHaveText("Message number 6");

  await page.getByRole("button", { name: "Load earlier messages" }).click();
  await expect(bubbles).toHaveCount(35);
  await expect(bubbles.first()).toHaveText("Message number 1");
  await expect(page.getByRole("button", { name: "Load earlier messages" })).toHaveCount(0);

  // Once the other member is suspended, the conversation is gone from the list and the thread.
  await admin.from("profiles").update({ status: "suspended" }).eq("id", ids.hist2);
  await page.goto("/messages");
  await expect(page.locator(`[data-conversation="${id}"]`)).toHaveCount(0);
  await page.goto(`/messages/${id}`);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
