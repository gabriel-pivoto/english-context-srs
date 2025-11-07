import { test, expect } from "@playwright/test";

test("magic link flow signs user in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Send magic link" }).click();
  await expect(page.getByText("Check your inbox", { exact: false })).toBeVisible();

  const response = await page.request.get("/api/dev/last-email");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { magicLink: string };

  await page.goto(payload.magicLink);
  await page.waitForURL(/\/study/);

  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === "session")).toBeTruthy();
  await expect(page.getByText("demo@example.com")).toBeVisible();
});
