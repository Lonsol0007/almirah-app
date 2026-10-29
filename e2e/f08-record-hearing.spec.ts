import type { Page } from "@playwright/test";
import { SEED, expect, scan, test } from "./fixtures";

// F08 (new, from the parity diff): with no live court feed, the advocate records each hearing's outcome.
async function openCase(page: Page, cnr: string) {
  await page.goto("/cnr");
  await page.getByLabel("CNR number").fill(cnr);
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page).toHaveURL(/\/cases\//);
}

test.describe("F08 record what happened at a hearing", () => {
  test("F08-H1 adjourned: new next date, history grows", async ({ page }) => {
    await openCase(page, SEED.todayPune);
    await page.getByRole("button", { name: /Hearing history/ }).click();
    const rows = page.getByRole("table", { name: "Hearing history" }).getByRole("row");
    const before = await rows.count();

    await page.getByRole("link", { name: "Record hearing" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Record hearing" })).toBeVisible();
    await scan(page);
    await page.getByLabel("What happened").fill("Cross-examination of PW1 part-heard");
    await page.getByLabel("Next hearing date").fill("2030-02-14");
    await page.getByRole("button", { name: "Save hearing" }).click();

    await expect(page.getByText("Next hearing · 14 Feb 2030").first()).toBeVisible();
    await page.getByRole("button", { name: /Hearing history/ }).click();
    await expect(rows).toHaveCount(before + 1);
    await expect(page.getByRole("cell", { name: "Cross-examination of PW1 part-heard" })).toBeVisible();
  });

  test("F08-H2 disposed: status and disposal recorded, off the calendar", async ({ page }) => {
    await openCase(page, SEED.todayPune);
    await page.getByRole("link", { name: "Record hearing" }).click();
    await page.getByRole("radio", { name: "Case disposed" }).check();
    await expect(page.getByLabel("Next hearing date")).toHaveCount(0);
    await page.getByLabel("Outcome").fill("Suit dismissed as withdrawn");
    await page.getByRole("button", { name: "Save hearing" }).click();
    await expect(page.getByText("Suit dismissed as withdrawn")).toBeVisible();
    await expect(page.getByText("Disposed").first()).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("list", { name: "Today's hearings" })).toHaveCount(0);
  });

  test("F08-N1 next date must be after the hearing", async ({ page }) => {
    await openCase(page, SEED.todayPune);
    await page.getByRole("link", { name: "Record hearing" }).click();
    await page.getByLabel("Hearing held on").fill("2026-10-28");
    await page.getByLabel("Next hearing date").fill("2026-10-01");
    await page.getByRole("button", { name: "Save hearing" }).click();
    await expect(page.getByText("The next date has to be after the hearing.")).toBeVisible();
    await expect(page.getByLabel("Next hearing date")).toBeFocused();
  });

  test("F08-N2 adjourned without a next date is refused", async ({ page }) => {
    await openCase(page, SEED.tomorrow);
    await page.getByRole("link", { name: "Record hearing" }).click();
    await page.getByRole("button", { name: "Save hearing" }).click();
    await expect(page.getByText("Add the next hearing date.")).toBeVisible();
  });

  test("F08-E1 a disposed case offers no Record hearing", async ({ page }) => {
    await openCase(page, SEED.disposed);
    await expect(page.getByRole("link", { name: "Record hearing" })).toHaveCount(0);
  });
});
