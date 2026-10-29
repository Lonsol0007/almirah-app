import { SEED, expect, scan, test } from "./fixtures";

test.describe("F01 look up a case by CNR", () => {
  test("F01-H1 typing a CNR opens the case", async ({ page }) => {
    await page.goto("/cnr");
    await page.getByLabel("CNR number").fill(SEED.todayPune);
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page).toHaveURL(/\/cases\//);
    await expect(page.getByRole("heading", { level: 2, name: /Ramesh Deshmukh vs Pune Municipal Corporation/ })).toBeVisible();
    await expect(page.getByText("Hearing today").first()).toBeVisible();
    await scan(page);
  });

  test("F01-E1 spaces, dashes and lower case are accepted", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("CNR number").fill("mhpu-0100 0421 2024");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Ramesh Deshmukh/ })).toBeVisible();
  });

  test("F01-E2 keyboard only: type and press Enter", async ({ page }) => {
    await page.goto("/cnr");
    await page.getByLabel("CNR number").focus();
    await page.keyboard.type(SEED.tomorrow);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 2, name: /Vikas Pawar/ })).toBeVisible();
  });

  test("F01-E3 unknown CNR offers to add it, pre-filled", async ({ page }) => {
    await page.goto("/cnr");
    await page.getByLabel("CNR number").fill("ZZZZ010000012026");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByText(/No record of/)).toBeVisible();
    await page.getByRole("link", { name: "Add it to your cases" }).click();
    await expect(page.getByLabel("CNR number")).toHaveValue("ZZZZ010000012026");
  });

  test("F01-E4 disposed case shows disposal, not a hearing date", async ({ page }) => {
    await page.goto("/cnr");
    await page.getByLabel("CNR number").fill(SEED.disposed);
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByText("Decreed in favour of plaintiff")).toBeVisible();
    await page.getByRole("button", { name: /Transfers and renumbering/ }).click();
    await expect(page.getByText(/Earlier number/)).toBeVisible();
  });

  test("F01-N1 too-short CNR shows an error and stays put", async ({ page }) => {
    await page.goto("/cnr");
    await page.getByLabel("CNR number").fill("MHPU01");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByText(/^A CNR is 16 letters and numbers/)).toBeVisible();
    await expect(page.getByLabel("CNR number")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/cnr$/);
  });

  test("F01-N2 empty submit shows an error", async ({ page }) => {
    await page.goto("/cnr");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByText(/^A CNR is 16 letters and numbers/)).toBeVisible();
  });

  test("F01-N3 a case id that doesn't exist shows not found", async ({ page }) => {
    await page.goto("/cases/does-not-exist");
    await expect(page.getByRole("heading", { name: "Case not found" })).toBeVisible();
  });

  test("F01-E5 case sections expand and collapse with the keyboard", async ({ page }) => {
    await page.goto("/cnr");
    await page.getByLabel("CNR number").fill(SEED.todayPune);
    await page.getByRole("button", { name: "Look up" }).click();
    const history = page.getByRole("button", { name: /Hearing history/ });
    await expect(history).toHaveAttribute("aria-expanded", "false");
    await history.focus();
    await page.keyboard.press("Enter");
    await expect(history).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("table", { name: "Hearing history" })).toBeVisible();
    await scan(page);
  });
});
