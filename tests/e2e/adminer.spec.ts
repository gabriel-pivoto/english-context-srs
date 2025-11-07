import { test, expect } from "@playwright/test";

test("Adminer UI is reachable", async ({ request }) => {
  const port = process.env.ADMINER_PORT ?? "85";
  const response = await request.get(`http://127.0.0.1:${port}`);
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain("Adminer");
});
