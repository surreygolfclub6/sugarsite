import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

loadEnvConfig(process.cwd());

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const password = "correct-horse-battery";
const reviewer = { email: `e2e-admin-${stamp}@ardor-test.dev`, id: "" };
const member = { email: `e2e-member-${stamp}@ardor-test.dev`, id: "" };
const photoIds: string[] = [];

async function createUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test.beforeAll(async () => {
  reviewer.id = await createUser(reviewer.email);
  member.id = await createUser(member.email);
  await admin.from("admins").insert({ user_id: reviewer.id });

  await admin
    .from("profiles")
    .update({
      display_name: "Modtest",
      birthdate: "1990-01-01",
      gender: "woman",
      city: "Colchester, Essex",
      bio: "A profile created for the moderation test.",
      status: "active",
    })
    .eq("id", member.id);

  for (const colour of ["#cc3355", "#3355cc"]) {
    const path = `${member.id}/${colour.slice(1)}.jpg`;
    const buffer = await sharp({ create: { width: 300, height: 400, channels: 3, background: colour } }).jpeg().toBuffer();
    await admin.storage.from("photos").upload(path, buffer, { contentType: "image/jpeg" });
    const { data } = await admin
      .from("photos")
      .insert({ user_id: member.id, storage_path: path, position: photoIds.length })
      .select("id")
      .single();
    photoIds.push(data!.id);
  }
});

test.afterAll(async () => {
  const { data: files } = await admin.storage.from("photos").list(member.id);
  if (files?.length) await admin.storage.from("photos").remove(files.map((f) => `${member.id}/${f.name}`));
  await admin.auth.admin.deleteUser(member.id);
  await admin.auth.admin.deleteUser(reviewer.id);
});

test("members who aren't admins get a 404 on /admin", async ({ page }) => {
  await signIn(page, member.email);
  await expect(page).toHaveURL(/\/discover/);
  await page.goto("/admin");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Photo review" })).toHaveCount(0);
});

test("admin rejects one photo and approves the rest, and the member sees the outcome", async ({ browser }) => {
  const adminPage = await (await browser.newContext()).newPage();
  await signIn(adminPage, reviewer.email);
  await adminPage.goto("/admin");

  const card = adminPage.locator(`[data-profile="${member.id}"]`);
  await expect(card.getByRole("heading", { name: "Modtest, 36" })).toBeVisible();
  await expect(card.getByRole("img", { name: "Pending photo" })).toHaveCount(2);

  // Reject the first photo with a reason.
  const first = card.getByRole("listitem").first();
  await first.getByLabel("Rejection reason").selectOption("explicit");
  await first.getByRole("button", { name: "Reject" }).click();
  await expect(card.getByRole("img", { name: "Pending photo" })).toHaveCount(1);

  // Approve what's left.
  await card.getByRole("button", { name: "Approve all photos" }).click();
  await expect(card).toHaveCount(0);

  const { data: photos } = await admin
    .from("photos")
    .select("id, moderation, rejection_reason, reviewed_by")
    .eq("user_id", member.id)
    .order("position");
  expect(photos).toMatchObject([
    { id: photoIds[0], moderation: "rejected", rejection_reason: "explicit", reviewed_by: reviewer.id },
    { id: photoIds[1], moderation: "approved", reviewed_by: reviewer.id },
  ]);

  // The member is told, and can replace the rejected photo.
  const memberPage = await (await browser.newContext()).newPage();
  await signIn(memberPage, member.email);
  await expect(memberPage.getByText("One of your photos wasn’t approved.")).toBeVisible();
  await memberPage.getByRole("link", { name: "Replace it" }).click();
  await expect(memberPage.getByText("Rejected: Explicit or nude")).toBeVisible();
  await expect(memberPage.locator('[data-status="approved"]')).toHaveText("Live");

  await memberPage.getByRole("button", { name: "Remove photo 1" }).click();
  await expect(memberPage.locator('[data-status="rejected"]')).toHaveCount(0);
});
