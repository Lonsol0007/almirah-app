// Every screen loads cleanly (no console errors, no 5xx), passes axe, and has no horizontal scroll.
import { expect, scan, test } from "./fixtures";

const SCREENS: Array<[string, string, RegExp]> = [
  ["S02", "/settings", /Settings/],
  ["S03", "/", /Find a case/],
  ["S04", "/cnr", /Where to find the CNR/],
  ["S05", "/cnr/scan", /Or type the CNR/],
  ["S06", "/search", /Search cases/],
  ["S23", "/cause-list", /Cause list/],
  ["S25", "/my-cases", /My cases/],
  ["S27", "/courts", /Find a court/],
  ["S28", "/my-cases/backup", /Save a backup/],
  ["S30", "/more", /Help/],
  ["add-case", "/cases/new", /Add a case/],
  ["account", "/account", /Demo mode/],
  ["login", "/login", /Accounts aren't switched on/],
  ["privacy", "/privacy", /Who processes data for us/],
  ["terms", "/terms", /Check the official record/],
  ["landing", "/welcome", /Your case diary, kept safe/],
];

for (const [id, path, heading] of SCREENS) {
  test(`${id} ${path} loads, is accessible, fits the width`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await scan(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("S17 case detail with every section open is accessible", async ({ page }) => {
  await page.goto("/cnr");
  await page.getByLabel("CNR number").fill("MHPU010004212024");
  await page.getByRole("button", { name: "Look up" }).click();
  for (const b of await page.locator("button[aria-expanded='false']").all()) await b.click();
  // Next 16 streams the title in after client-side navigation; scan once it has arrived.
  await expect(page).toHaveTitle(/Almirah/);
  await scan(page);
});

test("S16 search results are accessible", async ({ page }) => {
  await page.goto("/search");
  await page.getByRole("tab", { name: "Party" }).click();
  await page.getByLabel("Party name").fill("State");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: /results/ })).toBeVisible();
  await scan(page);
});
