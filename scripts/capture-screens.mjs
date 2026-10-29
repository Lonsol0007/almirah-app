// Screenshots every screen at 390px and 1440px for layout comparison, and fails on console errors.
// Usage: node scripts/capture-screens.mjs [baseUrl] [outDir]
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const out = process.argv[3] ?? "screenshots";
mkdirSync(out, { recursive: true });

const SCREENS = [
  { id: "S02", path: "/settings" },
  { id: "S03", path: "/" },
  { id: "S04", path: "/cnr" },
  { id: "S05", path: "/cnr/scan" },
  { id: "S06", path: "/search" },
  {
    id: "S16",
    path: "/search",
    async act(page) {
      await page.getByRole("tab", { name: "Party" }).click();
      await page.getByLabel("Party name").fill("Deshmukh");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page.getByRole("heading", { name: /result/ }).waitFor();
    },
  },
  { id: "S17", path: "/case?id=seed-mhpu010004212024" },
  { id: "S23", path: "/cause-list" },
  { id: "S24", path: "/cause-list?tab=advocate" },
  { id: "S25", path: "/my-cases" },
  { id: "S27", path: "/courts" },
  { id: "S28", path: "/my-cases/backup" },
  { id: "S30", path: "/more" },
  { id: "add-case", path: "/cases/new" },
];

const VIEWPORTS = [
  { suffix: "", width: 390, height: 844 },
  { suffix: "@1440", width: 1440, height: 900 },
];

const browser = await chromium.launch();
const failures = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, timezoneId: "Asia/Kolkata" });
  for (const s of SCREENS) {
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + s.path, { waitUntil: "networkidle" });
    if (s.act) await s.act(page);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) errors.push(`horizontal scroll at ${vp.width}px`);
    await page.screenshot({ path: `${out}/${s.id}${vp.suffix}.png`, fullPage: true });
    if (errors.length) failures.push(`${s.id}${vp.suffix}: ${errors.join(" | ")}`);
    console.log(`${errors.length ? "FAIL" : "ok  "} ${s.id}${vp.suffix} ${s.path}`);
    await page.close();
  }
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error("\n" + failures.join("\n"));
  process.exit(1);
}
