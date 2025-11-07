import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

type DevEmailPayload = {
  magicLink: string;
};

export async function loginWithMagicLink(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send magic link" }).click();
  await expect(page.getByText("Check your inbox", { exact: false })).toBeVisible();
  const response = await page.request.get("/api/dev/last-email");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as DevEmailPayload;
  await page.goto(payload.magicLink);
  await page.waitForURL(/\/study/);
}
