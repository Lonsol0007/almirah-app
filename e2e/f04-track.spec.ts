import type { Page } from "@playwright/test";
import { SEED, expect, openMyCases, scan, test } from "./fixtures";

async function openByCnr(page: Page, cnr: string) {
  await page.goto("/cnr");
  await page.getByLabel("CNR number").fill(cnr);
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page).toHaveURL(/\/case\?id=/);
}

const myList = (page: Page) => page.getByRole("main");

test.describe("F04 save a case and track its hearing", () => {
  test("F04-H1 save from the case page → in My cases and on the calendar", async ({ page }) => {
    await openByCnr(page, SEED.appealToday);
    await page.getByRole("button", { name: "Save to My cases" }).click();
    await expect(page.getByRole("button", { name: "In My cases" })).toHaveAttribute("aria-pressed", "true");
    await openMyCases(page);
    await expect(myList(page).getByText("Sunita Gaikwad vs Anil Gaikwad")).toBeVisible();
    await page.goto("/calendar");
    await expect(page.getByRole("list", { name: /Hearings on/ }).getByText("Sunita Gaikwad vs Anil Gaikwad")).toBeVisible();
    await scan(page);
  });

  test("F04-H2 add my own case, then find it", async ({ page }) => {
    await page.goto("/cases/new");
    await page.getByLabel("CNR number").fill("TNCH010000992026");
    await page.getByLabel("Your label (optional)").fill("Chennai lease dispute");
    await page.getByLabel("Petitioner", { exact: true }).fill("Kavya Raman");
    await page.getByLabel("Next hearing date").fill("2030-01-15");
    await page.getByRole("button", { name: "Save case" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Chennai lease dispute" })).toBeVisible();
    await openMyCases(page);
    await page.getByLabel("Search your cases").fill("raman");
    await expect(myList(page).getByText("Chennai lease dispute")).toBeVisible();
  });

  test("F04-E1 saved cases survive a reload", async ({ page }) => {
    await openByCnr(page, SEED.blr);
    await page.getByRole("button", { name: "Save to My cases" }).click();
    await expect(page.getByRole("button", { name: "In My cases" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "In My cases" })).toBeVisible();
  });

  test("F04-E2 double-clicking Save case creates one case", async ({ page }) => {
    await page.goto("/cases/new");
    await page.getByLabel("CNR number").fill("TNCH010000982026");
    await page.getByLabel("Petitioner", { exact: true }).fill("Double Click");
    const save = page.getByRole("button", { name: "Save case" });
    await save.dblclick();
    await expect(page).toHaveURL(/\/case\?id=/);
    await openMyCases(page);
    await page.getByLabel("Search your cases").fill("Double Click");
    await expect(myList(page).getByText("Double Click")).toHaveCount(1);
  });

  test("F04-N1 adding a CNR that's already saved is refused", async ({ page }) => {
    await page.goto("/cases/new");
    await page.getByLabel("CNR number").fill(SEED.todayPune);
    await page.getByLabel("Petitioner", { exact: true }).fill("Someone");
    await page.getByRole("button", { name: "Save case" }).click();
    await expect(page.getByText("This case is already in your list.")).toBeVisible();
  });

  test("F04-N2 add-case form flags a bad CNR and a missing name", async ({ page }) => {
    await page.goto("/cases/new");
    await page.getByLabel("CNR number").fill("bad");
    await page.getByRole("button", { name: "Save case" }).click();
    await expect(page.getByText("A CNR is 16 letters and numbers.")).toBeVisible();
    await expect(page.getByText(/Add a party name or a label/)).toBeVisible();
    await expect(page.getByLabel("CNR number")).toBeFocused();
  });

  test("F04-E3 remove asks first, and cancel keeps the case", async ({ page }) => {
    await openMyCases(page);
    const remove = page.getByRole("button", { name: /Remove Ramesh Deshmukh/ });
    await remove.click();
    await expect(page.getByRole("dialog", { name: "Remove this case?" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(myList(page).getByText(/Ramesh Deshmukh vs/)).toBeVisible();
    await remove.click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
    await expect(myList(page).getByText(/Ramesh Deshmukh vs/)).toHaveCount(0);
  });

  test("F04-E4 group by court, and search with no match", async ({ page }) => {
    await openMyCases(page);
    await page.getByRole("tab", { name: "By court" }).click();
    await expect(page.getByRole("heading", { name: /City Civil Court Complex, Mumbai/ })).toBeVisible();
    await page.getByLabel("Search your cases").fill("nobody-matches-this");
    await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByRole("heading", { name: /Civil Judge, Senior Division, District Court Complex, Pune/ })).toBeVisible();
    await scan(page);
  });

  test("F04-E5 refresh says it's up to date (no live court feed)", async ({ page }) => {
    await openByCnr(page, SEED.todayPune);
    await page.getByRole("button", { name: "Check for updates" }).click();
    await expect(page.getByText("Already up to date")).toBeVisible();
  });

  test("F04-E6 empty My cases explains what to do", async ({ page }) => {
    await openMyCases(page);
    const removeButtons = page.getByRole("button", { name: /^Remove .* from My cases$/ });
    for (let left = await removeButtons.count(); left > 0; left--) {
      await removeButtons.first().click();
      await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
      await expect(removeButtons).toHaveCount(left - 1);
    }
    await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add a case" })).toBeVisible();
    await scan(page);
  });

  test("F04-E7 calendar: arrow keys move between days", async ({ page }) => {
    await page.goto("/calendar");
    const today = page.locator("[data-date][tabindex='0']");
    const date = await today.getAttribute("data-date");
    await today.focus();
    await page.keyboard.press("ArrowRight");
    const next = new Date(Date.parse(date + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10);
    await expect(page.locator(`[data-date='${next}']`)).toBeFocused();
    await expect(page.locator(`[data-date='${next}']`)).toHaveAttribute("aria-pressed", "true");
  });

  test("BUG-006 adding a CNR you removed earlier brings it back instead of refusing", async ({ page }) => {
    await openMyCases(page);
    await page.getByRole("button", { name: /Remove Ramesh Deshmukh/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("main").getByText(/Ramesh Deshmukh vs/)).toHaveCount(0);
    await page.goto("/cases/new");
    await page.getByLabel("CNR number").fill(SEED.todayPune);
    await page.getByLabel("Petitioner", { exact: true }).fill("Ramesh Deshmukh");
    await page.getByRole("button", { name: "Save case" }).click();
    await expect(page.getByRole("button", { name: "In My cases" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Ramesh Deshmukh vs Pune Municipal Corporation/ })).toBeVisible();
  });

  test("BUG-003 removing a case doesn't flash the list back to loading", async ({ page }) => {
    await openMyCases(page);
    await page.evaluate(() => {
      const w = window as unknown as { sawSkeleton: boolean };
      w.sawSkeleton = false;
      new MutationObserver(() => {
        if (document.querySelector("main [role=status]")) w.sawSkeleton = true;
      }).observe(document.body, { subtree: true, childList: true });
    });
    const cards = page.getByRole("main").getByRole("article");
    const before = await cards.count();
    await page.getByRole("button", { name: /Remove Ramesh Deshmukh/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
    await expect(cards).toHaveCount(before - 1);
    expect(await page.evaluate(() => (window as unknown as { sawSkeleton: boolean }).sawSkeleton)).toBe(false);
  });
});
