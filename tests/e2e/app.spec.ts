import { test, expect } from "@playwright/test";
test("private archive redirects to login without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/cases");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("heading", { name: "A fresh start." }),
  ).toBeVisible();
});
test("authorized user can complete a real case lifecycle", async ({ page }) => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "Requires provisioned Supabase test account and configured frontend",
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Hello/ })).toBeVisible();
  await page
    .getByRole("link", { name: "New Case", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Patient alias", { exact: true })
    .fill(`TEST-${Date.now()}`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Department", { exact: true }).fill("Test Medicine");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Chief presenting complaints", { exact: true })
    .fill("Test complaint");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Final diagnosis", { exact: true })
    .fill("Test diagnosis");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Complete case", exact: true })
    .click();
  await expect(page.locator("article h1")).toHaveText("Test diagnosis");
  await page
    .getByRole("button", { name: "Favorite case", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Favorite case", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("button", { name: "Delete case", exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.getByRole("heading", { name: "My Cases", exact: true }),
  ).toBeVisible();
});

// Explicit HTTP fixtures exercise layout/interaction; these are not live backend tests.
import { mockWorkspace } from "./fixtures";
test("workspace layout, filter dialog, section navigation and logout with HTTP fixtures", async ({
  page,
}) => {
  test.skip(
    process.env.E2E_MOCK !== "1",
    "Run with E2E_MOCK=1 to enable explicit HTTP fixtures",
  );
  await mockWorkspace(page);
  await expect(
    page.getByRole("heading", { name: "Hello, Test." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "My Cases", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("link", { name: "New Case", exact: true })
    .first()
    .click();
  await page.getByLabel("Patient alias", { exact: true }).fill("TEST NEW");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Admission details", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/editor-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator(".save-status")).toHaveText("Saved");
  await page
    .getByRole("link", { name: "Settings", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
});
