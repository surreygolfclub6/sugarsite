import { expect, test, type Browser, type Page } from "@playwright/test";
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
const email = (key: string) => `e2e-acct-${key}-${stamp}@ardor-test.dev`;

async function member(key: string, name: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await admin.auth.admin.createUser({ email: email(key), password, email_confirm: true });
  if (error) throw error;
  ids[key] = data.user.id;
  await admin
    .from("profiles")
    .update({
      display_name: name,
      birthdate: "1990-01-01",
      gender: "woman",
      seeking: ["man"],
      city: "Colchester, Essex",
      place_id: 2652618,
      relationship_status: "single",
      relationship_goals: ["long_term"],
      height_cm: 170,
      body_type: "average",
      hair_colour: "brown",
      ethnicity: "prefer_not_to_say",
      headline: "Original headline",
      bio: `Original bio for ${name}, written by the account test.`,
      status: "active",
      ...extra,
    })
    .eq("id", data.user.id);
}

async function signIn(page: Page, key: string, pw = password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email(key));
  await page.getByLabel("Password").fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function open(browser: Browser, key: string, pw = password): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, key, pw);
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  return page;
}

async function chat(a: string, b: string, lines: [string, string][]) {
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
    member("reset", "Resetta"),
    member("acct", "Accta"),
    member("del", "Delta"),
    member("pal", "Pal", { gender: "man", seeking: ["woman"] }),
  ]);
  const photo = `${ids.del}/p.jpg`;
  const buffer = await sharp({ create: { width: 200, height: 300, channels: 3, background: "#884422" } }).jpeg().toBuffer();
  await admin.storage.from("photos").upload(photo, buffer, { contentType: "image/jpeg" });
  await admin.from("photos").insert({ user_id: ids.del, storage_path: photo, moderation: "approved", position: 0 });
});

test.afterAll(async () => {
  for (const [key, id] of Object.entries(ids)) {
    const { data: files } = await admin.storage.from("photos").list(id);
    if (files?.length) await admin.storage.from("photos").remove(files.map((f) => `${id}/${f.name}`));
    if (key !== "del") await admin.auth.admin.deleteUser(id);
  }
});

test("the forgot-password form never reveals who has an account, and bad or missing links are explained", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password/);

  await page.getByLabel("Email").fill("not an email");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();

  // An address with no account gets exactly the same answer as one that does.
  await page.getByLabel("Email").fill(`nobody-${stamp}@ardor-test.dev`);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If there’s an account for that email, we’ve sent a link")).toBeVisible();

  await page.goto("/auth/confirm?token_hash=not-a-real-token&type=recovery");
  await expect(page).toHaveURL(/\/login\?error=reset/);
  await expect(page.getByText("That reset link has expired or was already used.")).toBeVisible();

  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
});

test("a reset link lets you choose a new password once", async ({ browser }) => {
  const { data } = await admin.auth.admin.generateLink({ type: "recovery", email: email("reset") });
  const hashed = data.properties!.hashed_token;

  const page = await (await browser.newContext()).newPage();
  await page.goto(`/auth/confirm?token_hash=${hashed}&type=recovery`);
  await expect(page).toHaveURL(/\/reset-password/);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();

  await page.getByLabel("New password", { exact: true }).fill("short");
  await page.getByLabel("Confirm new password").fill("short");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Use at least 10 characters")).toBeVisible();

  await page.getByLabel("New password", { exact: true }).fill("brand-new-password-1");
  await page.getByLabel("Confirm new password").fill("something-different-2");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("The two passwords don’t match.")).toBeVisible();

  await page.getByLabel("New password", { exact: true }).fill("brand-new-password-1");
  await page.getByLabel("Confirm new password").fill("brand-new-password-1");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/discover/);

  // The new password works, the old one doesn't.
  await open(browser, "reset", "brand-new-password-1");
  const old = await (await browser.newContext()).newPage();
  await signIn(old, "reset");
  await expect(old.getByText("Email or password is incorrect.")).toBeVisible();

  // The link can't be used a second time.
  const again = await (await browser.newContext()).newPage();
  await again.goto(`/auth/confirm?token_hash=${hashed}&type=recovery`);
  await expect(again).toHaveURL(/\/login\?error=reset/);
});

test("signing in returns you to the page you were after", async ({ page }) => {
  await page.goto("/messages");
  await expect(page).toHaveURL(/\/login\?next=%2Fmessages/);
  await page.getByLabel("Email").fill(email("pal"));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/messages$/);
});

test("you can change your password once you prove the current one", async ({ browser }) => {
  const page = await open(browser, "acct");
  await page.goto("/more/account");
  const form = page.getByRole("form", { name: "Change password" });
  const submit = form.getByRole("button", { name: "Change password" });

  await form.getByLabel("Current password").fill("not-my-password");
  await form.getByLabel("New password", { exact: true }).fill("second-password-123");
  await form.getByLabel("Confirm new password").fill("second-password-123");
  await submit.click();
  await expect(form.getByText("Your current password is incorrect.")).toBeVisible();

  // Forms clear after an error, so fill everything again.
  await form.getByLabel("Current password").fill(password);
  await form.getByLabel("New password", { exact: true }).fill("second-password-123");
  await form.getByLabel("Confirm new password").fill("typo-typo-typo-1");
  await submit.click();
  await expect(form.getByText("The two new passwords don’t match.")).toBeVisible();

  await form.getByLabel("Current password").fill(password);
  await form.getByLabel("New password", { exact: true }).fill("second-password-123");
  await form.getByLabel("Confirm new password").fill("second-password-123");
  await submit.click();
  await expect(form.getByText("Your password has been changed.")).toBeVisible();

  await open(browser, "acct", "second-password-123");
});

test("editing your profile saves changes, keeps your input on errors, and protects fixed fields", async ({ browser }) => {
  const page = await open(browser, "acct", "second-password-123");
  await page.goto("/more/profile");
  const form = page.getByRole("form", { name: "Edit profile" });

  // Prefilled with what's there. Date of birth is shown but can't be changed.
  await expect(form.getByLabel("First name or nickname")).toHaveValue("Accta");
  await expect(form.getByLabel("Height")).toHaveValue("170");
  await expect(form.getByLabel("Location")).toHaveValue("Colchester, Essex");
  await expect(form.getByText("1 January 1990")).toBeVisible();
  await expect(form.getByLabel("Date of birth")).toHaveCount(0);

  // A mistake keeps everything you typed.
  await form.getByLabel("First name or nickname").fill("Acct Two");
  await form.getByLabel("Headline (optional)").fill("A brand new headline");
  await form.getByLabel("About you", { exact: true }).fill("too short");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form.getByText("Tell people a little about yourself (at least 20 characters).")).toBeVisible();
  await expect(form.getByLabel("First name or nickname")).toHaveValue("Acct Two");
  await expect(form.getByLabel("Headline (optional)")).toHaveValue("A brand new headline");
  await expect(form.getByLabel("About you", { exact: true })).toHaveValue("too short");

  // Then a good save, including goals, height and a new location.
  await form.getByLabel("About you", { exact: true }).fill("Now a proper bio that is easily long enough.");
  await form.getByText("Friendship", { exact: true }).click();
  await form.getByLabel("Height").selectOption("180");
  await form.getByLabel("Location").fill("Chelms");
  await page.getByRole("option", { name: "Chelmsford, Essex" }).click();
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form.getByText("Saved.")).toBeVisible();
  await expect(form.getByLabel("First name or nickname")).toHaveValue("Acct Two");

  const { data: saved } = await admin.from("profiles").select("*").eq("id", ids.acct).single();
  expect(saved).toMatchObject({
    display_name: "Acct Two",
    headline: "A brand new headline",
    bio: "Now a proper bio that is easily long enough.",
    height_cm: 180,
    city: "Chelmsford, Essex",
    birthdate: "1990-01-01",
    status: "active",
  });
  expect(saved!.relationship_goals.sort()).toEqual(["friendship", "long_term"]);
  expect(saved!.place_id).not.toBe(2652618);

  // Other members see the update.
  const pal = await open(browser, "pal");
  await pal.goto(`/profile/${ids.acct}`);
  await expect(pal.getByRole("heading", { name: "Acct Two, 36" })).toBeVisible();
  await expect(pal.getByText("A brand new headline")).toBeVisible();

  // Fixed fields can't be changed through the API either.
  const mine = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  await mine.auth.signInWithPassword({ email: email("acct"), password: "second-password-123" });
  expect((await mine.from("profiles").update({ birthdate: "2000-01-01" }).eq("id", ids.acct)).error).not.toBeNull();
  expect((await mine.from("profiles").update({ place_id: 1 }).eq("id", ids.acct)).error).not.toBeNull();
  expect((await mine.from("profiles").update({ status: "suspended" }).eq("id", ids.acct)).error).not.toBeNull();
});

test("you can download your data, and nobody else can", async ({ browser }) => {
  await chat("acct", "pal", [["pal", "Hello from Pal"], ["acct", "Hello back"]]);
  const page = await open(browser, "acct", "second-password-123");

  await page.goto("/more/account");
  await expect(page.getByRole("link", { name: "Download my data" })).toHaveAttribute("href", "/more/account/export");

  const response = await page.request.get("/more/account/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain("attachment");
  const text = await response.text();
  const body = JSON.parse(text);
  expect(body.account).toMatchObject({ id: ids.acct, email: email("acct") });
  expect(body.profile).toMatchObject({ display_name: "Acct Two", birthdate: "1990-01-01" });
  expect(body.conversations).toHaveLength(1);
  expect(body.conversations[0].with_member).toBe(ids.pal);
  expect(body.conversations[0].messages.map((m: { from: string; body: string }) => `${m.from}: ${m.body}`)).toEqual(["them: Hello from Pal", "you: Hello back"]);
  expect(text).not.toMatch(/password|encrypted/i);

  // Signed-out requests are turned away.
  const stranger = await (await browser.newContext()).request.get("/more/account/export", { maxRedirects: 0 });
  expect(stranger.status()).toBe(307);
});

test("deleting your account removes your data and cannot be done by accident", async ({ browser }) => {
  const convId = await chat("del", "pal", [["del", "Message from the account being deleted"]]);
  const page = await open(browser, "del");
  await page.goto("/more/account");
  const form = page.getByRole("form", { name: "Delete account" });
  const submit = form.getByRole("button", { name: "Delete my account" });

  await submit.click();
  await expect(form.getByText("Tick the box to confirm")).toBeVisible();
  await form.getByLabel("I understand this is permanent.").check();
  await form.getByLabel("Your password").fill("wrong-password");
  await submit.click();
  await expect(form.getByText("Your password is incorrect.")).toBeVisible();
  expect((await admin.auth.admin.getUserById(ids.del)).data.user).not.toBeNull();

  await form.getByLabel("I understand this is permanent.").check();
  await form.getByLabel("Your password").fill(password);
  await submit.click();
  await expect(page).toHaveURL(/\/goodbye/);
  await expect(page.getByRole("heading", { name: "Your account has been deleted" })).toBeVisible();

  // Gone from every place we keep it.
  expect((await admin.auth.admin.getUserById(ids.del)).data.user).toBeNull();
  expect((await admin.from("profiles").select("id").eq("id", ids.del)).data).toEqual([]);
  expect((await admin.from("photos").select("id").eq("user_id", ids.del)).data).toEqual([]);
  expect((await admin.from("messages").select("id").eq("conversation_id", convId)).data).toEqual([]);
  expect((await admin.storage.from("photos").list(ids.del)).data).toEqual([]);

  // The other member's conversation with them is gone, and the account can't sign in.
  const pal = await open(browser, "pal");
  await pal.goto("/messages");
  await expect(pal.locator(`[data-conversation="${convId}"]`)).toHaveCount(0);
  const again = await (await browser.newContext()).newPage();
  await signIn(again, "del");
  await expect(again.getByText("Email or password is incorrect.")).toBeVisible();
});
