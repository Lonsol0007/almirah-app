// Shared test setup: every test fails on a console error or a 5xx, and `scan` runs an axe check.
import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") problems.push(`console error: ${m.text()}`);
      });
      page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
      page.on("response", (r) => {
        if (r.status() >= 500) problems.push(`${r.status()} on ${r.url()}`);
      });
      await use();
      expect(problems, problems.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** axe scan against WCAG 2.1 A/AA. The dev-only Next.js badge is excluded. */
export async function scan(page: Page) {
  // Scan the settled page: during client navigation Next swaps <title> out and back in a few ms later.
  await page.waitForLoadState("networkidle");
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

/** Seed CNRs (see src/lib/data/seed.ts). Hearing dates are relative to today in IST. */
export const SEED = {
  todayPune: "MHPU010004212024", // saved, Pune Civil SD court 4, hearing today
  appealToday: "MHPU010009032022", // not saved, same court, hearing today
  tomorrow: "MHPU020011872023", // saved, hearing tomorrow, FIR Shivajinagar 212/2023
  disposed: "MHMC010033012021", // saved, disposed, has a transfer record
  blr: "KABN010017782024", // not saved, Bengaluru
};

export async function openMyCases(page: Page) {
  await page.goto("/my-cases");
  await expect(page.getByRole("heading", { name: /Today/ })).toBeVisible();
}
