import { test, expect } from "@playwright/test";
import { testPrisma } from "../helpers/prisma";
import { loginWithMagicLink } from "../helpers/auth";

test("reviewing a card updates its schedule", async ({ page }) => {
  const user = await testPrisma.user.findUniqueOrThrow({ where: { email: "demo@example.com" } });
  const dueItem = await testPrisma.item.findFirstOrThrow({
    where: { userId: user.id },
    orderBy: { due: "asc" },
  });

  await loginWithMagicLink(page, "demo@example.com");
  await page.goto("/study");
  await expect(page.getByText(dueItem.prompt.slice(0, 20), { exact: false })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(dueItem.answer, "i") }).click();
  const reviewRequest = page.waitForResponse((response) => response.url().includes("/api/review"));
  await page.getByRole("button", { name: "Good (G)" }).click();
  await reviewRequest;

  const updated = await testPrisma.item.findUniqueOrThrow({ where: { id: dueItem.id } });
  expect(updated.interval).toBeGreaterThan(dueItem.interval);
  expect(new Date(updated.due).getTime()).toBeGreaterThan(new Date(dueItem.due).getTime());
});
