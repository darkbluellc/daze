// Capture real app screenshots (light + dark) for the landing page.
// Usage: node scripts/shots.mjs   (dev server must be running on :3000)

import { chromium } from "@playwright/test";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.resolve(process.cwd(), "public/screenshots");

const pages = [
  { name: "dashboard", path: "/dashboard", ready: "Welcome" },
  { name: "upcoming", path: "/upcoming", ready: "Upcoming" },
  { name: "holidays", path: "/holidays", ready: "Holidays" },
];

async function dismissOnboarding(page) {
  const btn = page.getByRole("button", { name: "Skip all for now" });
  if (await btn.count()) await btn.click().catch(() => {});
}

async function run(theme) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  await context.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }, theme);

  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.fill("#email", "demo@daze.local");
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  await dismissOnboarding(page);

  for (const p of pages) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: "load" });
    await dismissOnboarding(page);
    await page.getByText(p.ready, { exact: false }).first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${p.name}-${theme}.png`) });
    console.log(`  ✓ ${p.name}-${theme}.png`);
  }

  // Reminder config dialog (open Ada Lovelace's — richly configured).
  await page.goto(`${BASE}/birthdays`, { waitUntil: "load" });
  await dismissOnboarding(page);
  await page.getByRole("button", { name: "Configure" }).first().click();
  await page.getByText("Notify ahead of time").waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `config-${theme}.png`) });
  console.log(`  ✓ config-${theme}.png`);

  await browser.close();
}

for (const theme of ["light", "dark"]) {
  console.log(`Capturing ${theme}…`);
  await run(theme);
}
console.log("Done.");
