import { chromium } from "playwright";
import { spawn } from "child_process";

const DEV_PORT = Number(process.env.E2E_DEV_PORT ?? 3005);
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_PORT}`;

async function waitForServer(url: string, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not start within ${timeoutMs}ms`);
}

async function run() {
  const nextExecutable =
    process.platform === "win32"
      ? "node_modules/.bin/next.cmd"
      : "node_modules/.bin/next";
  const devProcess = spawn(
    nextExecutable,
    ["dev", "--hostname", "127.0.0.1", "--port", String(DEV_PORT)],
    {
      env: { ...process.env, PORT: String(DEV_PORT) },
      stdio: "inherit",
      shell: false,
    },
  );

  const shutdown = () => {
    if (!devProcess.killed) {
      devProcess.kill("SIGTERM");
    }
  };

  process.on("exit", shutdown);
  process.on("SIGINT", () => {
    shutdown();
    process.exit(1);
  });

  await waitForServer(DEV_SERVER_URL);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ createdCloze: 4, createdVocab: 4, skipped: 0 }),
    });
  });

  let dueCallCount = 0;
  await page.route("**/api/due", async (route) => {
    dueCallCount += 1;
    if (dueCallCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-item-1",
          type: "CLOZE",
          prompt: "I placed my passport on the ____ at security.",
          choices: ["tray", "table", "shelf"],
          answer: "tray",
          explanation: "You place items on the tray.",
          lemma: "tray",
        }),
      });
      return;
    }

    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/api/review", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        nextDue: new Date().toISOString(),
        ease: 2.6,
        interval: 1,
      }),
    });
  });

  try {
    await page.goto(`${DEV_SERVER_URL}/`);

    await page.getByLabel("Daily context").fill("airport check-in with extra luggage");
    await page.getByLabel("CEFR Level").selectOption("B1");

    await page.getByRole("button", { name: "Generate session" }).click();
    await page.getByText("Added 4 cloze and 4 vocab items.").waitFor();

    await page.getByRole("link", { name: /Go to Study/ }).click();

    await page.getByText("Cloze").waitFor();
    await page.getByRole("button", { name: "1. tray" }).click();
    await page.getByText("Correct answer: tray").waitFor();

    await page.getByRole("button", { name: "Good (G)" }).click();
    await page.getByText("Nothing due right now!").waitFor();

    console.log("✅ Playwright smoke test completed successfully.");
  } finally {
    await browser.close();
    shutdown();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
