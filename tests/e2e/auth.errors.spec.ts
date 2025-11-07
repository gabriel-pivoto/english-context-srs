import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { testPrisma } from "../helpers/prisma";
import { hashToken } from "../../src/lib/token";

test("expired token shows friendly error", async ({ page }) => {
  const token = randomUUID().replace(/-/g, "");
  await testPrisma.emailToken.create({
    data: {
      email: "expired@example.com",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() - 1_000 * 60),
    },
  });

  await page.goto(`/api/auth/callback?token=${token}`);
  await expect(page).toHaveURL(/\/login\?error=expired/);
  await expect(page.getByText("This link has expired", { exact: false })).toBeVisible();
});

test("used token cannot be reused", async ({ page }) => {
  const token = randomUUID().replace(/-/g, "");
  await testPrisma.emailToken.create({
    data: {
      email: "demo@example.com",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 1_000 * 60 * 10),
    },
  });

  await page.goto(`/api/auth/callback?token=${token}`);
  await page.waitForURL(/\/study/);

  await page.goto(`/api/auth/callback?token=${token}`);
  await expect(page).toHaveURL(/\/login\?error=used/);
  await expect(page.getByText("Link already used", { exact: false })).toBeVisible();
});
