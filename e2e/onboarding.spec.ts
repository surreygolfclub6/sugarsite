import { expect, test } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

loadEnvConfig(process.cwd());

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `e2e-${Date.now()}@ardor-test.dev`;
const password = "correct-horse-battery";
let userId: string;

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
});

test.afterAll(async () => {
  if (!userId) return;
  const { data: files } = await admin.storage.from("photos").list(userId);
  if (files?.length) await admin.storage.from("photos").remove(files.map((f) => `${userId}/${f.name}`));
  await admin.auth.admin.deleteUser(userId);
});

const jpeg = (colour: string) =>
  sharp({ create: { width: 400, height: 500, channels: 3, background: colour } }).jpeg().toBuffer();

test("sign in, complete onboarding, go live with photos in review", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // A fresh profile is incomplete, so discover bounces to onboarding.
  await expect(page).toHaveURL(/\/onboarding/);

  const next = () => page.getByRole("button", { name: "Continue" }).click();

  // Continue is blocked until every field on the step is answered.
  await next();
  await expect(page.getByText("Please answer everything on this step to continue.")).toBeVisible();

  // Step 1: The basics. Use an under-18 birthdate so the server rejects the submit later.
  await page.getByLabel("First name or nickname").fill("Sam");
  await page.getByLabel("Date of birth").fill("2015-01-01");
  await page.getByLabel("Location").fill("Colch");
  await page.getByRole("option", { name: "Colchester, Essex" }).click();
  await page.getByText("Woman", { exact: true }).click();
  await page.getByText("Men", { exact: true }).click();
  await next();

  // Step 2: Relationship
  await next();
  await expect(page.getByText("Please answer everything on this step to continue.")).toBeVisible();
  await page.getByLabel("Relationship status").selectOption("divorced");
  await page.getByText("Marriage minded", { exact: true }).click();
  await page.getByText("Long-term relationship", { exact: true }).click();
  await next();

  // Step 3: Appearance (every field mandatory)
  await page.getByLabel("Height", { exact: true }).selectOption("178");
  await page.getByLabel("Body type").selectOption("athletic");
  await page.getByLabel("Hair colour").selectOption("brown");
  await page.getByLabel("Ethnicity").selectOption("prefer_not_to_say");
  await next();

  // Step 4: About you
  await page.getByLabel("About you").fill("I run, cook badly and love a long walk with a dog.");
  await next();

  // Step 5: Photos are mandatory too.
  await page.getByRole("button", { name: "Submit profile" }).click();
  await expect(page.getByText("Please answer everything on this step to continue.")).toBeVisible();

  await page.locator("#photo_files").setInputFiles([
    { name: "a.jpg", mimeType: "image/jpeg", buffer: await jpeg("#cc3355") },
    { name: "b.jpg", mimeType: "image/jpeg", buffer: await jpeg("#3355cc") },
  ]);
  await expect(page.getByRole("img", { name: "Photo 2" })).toBeVisible();
  await page.getByRole("button", { name: "Remove photo 2" }).click();
  await expect(page.getByRole("img", { name: "Photo 2" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await page.getByRole("button", { name: "Submit profile" }).click();

  // The server rejects the under-18 birthdate and sends us back to step 1...
  await expect(page.getByText("You must be 18 or over to use this site.")).toBeVisible();
  await expect(page.getByLabel("Date of birth")).toBeVisible();

  // ...without wiping anything entered on any step (the regression).
  await expect(page.getByLabel("First name or nickname")).toHaveValue("Sam");
  await expect(page.getByLabel("Location")).toHaveValue("Colchester, Essex");
  await page.getByLabel("Date of birth").fill("1990-05-15");
  await next();
  await expect(page.getByLabel("Relationship status")).toHaveValue("divorced");
  await next();
  await expect(page.getByLabel("Height", { exact: true })).toHaveValue("178");
  await expect(page.getByLabel("Hair colour")).toHaveValue("brown");
  await next();
  await expect(page.getByLabel("About you")).not.toBeEmpty();
  await next();
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await page.getByRole("button", { name: "Submit profile" }).click();

  await expect(page).toHaveURL(/\/discover/);
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();
  await expect(page.getByText(/Your profile is live/)).toBeVisible();

  // The data really reached the database.
  const { data: profile, error } = await admin.from("profiles").select("*").eq("id", userId).single();
  expect(error).toBeNull();
  expect(profile).toMatchObject({
    display_name: "Sam",
    birthdate: "1990-05-15",
    gender: "woman",
    city: "Colchester, Essex",
    place_id: 2652618,
    seeking: ["man"],
    relationship_status: "divorced",
    relationship_goals: expect.arrayContaining(["marriage", "long_term"]),
    height_cm: 178,
    body_type: "athletic",
    hair_colour: "brown",
    ethnicity: "prefer_not_to_say",
    status: "active",
  });

  // One photo survives, waiting for moderation, with its file in private storage.
  const { data: photos } = await admin.from("photos").select("storage_path, moderation").eq("user_id", userId);
  expect(photos).toHaveLength(1);
  expect(photos![0].moderation).toBe("pending");
  const { data: stored } = await admin.storage.from("photos").list(userId);
  expect(stored!.map((f) => `${userId}/${f.name}`)).toContain(photos![0].storage_path);
});
