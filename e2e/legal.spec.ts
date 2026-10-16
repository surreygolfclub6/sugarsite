import { expect, test } from "@playwright/test";

test("Terms, Privacy and Safety pages exist, are linked from the home page, and flag that they are drafts", async ({ page }) => {
  await page.goto("/");
  for (const [link, heading] of [
    ["Terms", "Terms of use"],
    ["Privacy", "Privacy policy"],
    ["Safety", "Staying safe"],
  ] as const) {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("Draft for review");
    await expect(page.getByRole("navigation", { name: "Legal" })).toBeVisible();
  }
});

test("the privacy policy covers sensitive data, location, rights and deletion", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Sensitive information" })).toBeVisible();
  await expect(page.getByText("sexual orientation")).toBeVisible();
  await expect(page.getByText("explicit consent").first()).toBeVisible();
  await expect(page.getByText("not your precise location")).toBeVisible();
  await expect(page.getByText("rounded up to the nearest 5 miles")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your rights" })).toBeVisible();
  await expect(page.getByText("Download my data")).toBeVisible();
  await expect(page.getByText("Delete account")).toBeVisible();
  await expect(page.getByText("Information Commissioner")).toBeVisible();
});

test("safety guidance explains blocking, reporting and what to do in an emergency", async ({ page }) => {
  await page.goto("/safety");
  await expect(page.getByRole("heading", { name: "Blocking and reporting" })).toBeVisible();
  await expect(page.getByText("Appears to be under 18")).toBeVisible();
  await expect(page.getByText("999")).toBeVisible();
  await page.getByRole("link", { name: "Terms" }).first().click();
  await expect(page).toHaveURL(/\/terms/);
});

test("signing up needs both the age and terms tick and a separate consent for sensitive details", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`consent-check-${Date.now()}@ardor-test.dev`);
  await page.getByLabel("Password").fill("a-long-enough-password");

  // Neither ticked.
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Confirm that you’re 18 or over to continue.")).toBeVisible();

  // Age and terms ticked, but no explicit consent.
  await page.getByLabel(/I’m 18 or over and agree to the Terms/).check();
  await page.getByLabel("Email").fill(`consent-check-${Date.now()}@ardor-test.dev`);
  await page.getByLabel("Password").fill("a-long-enough-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Please agree to how we use the sensitive details you add to your profile.")).toBeVisible();

  // The consent wording names what it covers and links to the policy.
  const consent = page.getByLabel(/I agree that Ardor may use the sensitive details/);
  await expect(consent).not.toBeChecked();
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  await expect(page.getByText("who I’m looking for, my relationship goals and my ethnicity")).toBeVisible();
});
