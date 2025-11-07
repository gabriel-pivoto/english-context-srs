import { test, expect } from "@playwright/test";
import { loginWithMagicLink } from "../helpers/auth";

test("user can create, extend, and prune contexts", async ({ page }) => {
  await loginWithMagicLink(page, "demo@example.com");
  await page.goto("/");

  const uniqueTitle = `Playwright context ${Date.now().toString().slice(-5)}`;
  await page.getByLabel("Context title").fill(uniqueTitle);
  await page
    .getByLabel("Describe the situation")
    .fill("Practicing small talk before a remote sprint review with American teammates.");
  await page.getByLabel("Cloze cards").fill("2");
  await page.getByLabel("Vocab cards").fill("2");
  await page.getByRole("button", { name: "Create study context" }).click();
  await expect(page.getByText(`Created ${uniqueTitle}`, { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Edit set" }).click();
  await expect(page).toHaveURL(/\/contexts\//);

  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible();
  const initialCount = await rows.count();

  await rows.first().locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: /Remove selected/ }).click();
  await expect(rows).toHaveCount(initialCount - 1);
  const removedCount = initialCount - 1;

  await page.getByLabel("Cloze").fill("1");
  await page.getByLabel("Vocab").fill("1");
  await page.getByRole("button", { name: "Generate cards" }).click();
  await expect(page.getByText("Added new questions", { exact: false })).toBeVisible();
  await expect
    .poll(async () => rows.count(), { message: "Rows should grow after generation." })
    .toBeGreaterThan(removedCount);
});
