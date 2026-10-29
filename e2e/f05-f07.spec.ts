import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { SEED, expect, openMyCases, scan, test } from "./fixtures";

// Short paths: Chrome on Windows can't read upload files whose full path passes 260 characters.
const tmp = (name: string) => join(mkdtempSync(join(tmpdir(), "ct-")), name);

async function puneComplex(page: Page) {
  await page.getByLabel("State").selectOption({ label: "Maharashtra" });
  await page.getByLabel("District", { exact: true }).selectOption({ label: "Pune" });
  await page.getByLabel("Court complex").selectOption({ label: "District Court Complex, Pune" });
}

test.describe("F05 cause list", () => {
  test("F05-H1 one court, today, in court-number order", async ({ page }) => {
    await page.goto("/cause-list");
    await puneComplex(page);
    await page.getByLabel("Court", { exact: true }).selectOption({ label: "Civil Judge, Senior Division" });
    await page.getByRole("button", { name: "Show list" }).click();
    const list = page.getByRole("list", { name: "Listed cases" });
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await scan(page);
  });

  test("F05-E1 a date with nothing listed", async ({ page }) => {
    await page.goto("/cause-list");
    await puneComplex(page);
    await page.getByLabel("Court", { exact: true }).selectOption({ label: "Civil Judge, Senior Division" });
    await page.getByLabel("Date").fill("2031-01-01");
    await page.getByRole("button", { name: "Show list" }).click();
    await expect(page.getByRole("heading", { name: "Nothing listed" })).toBeVisible();
  });

  test("F05-N1 no court chosen", async ({ page }) => {
    await page.goto("/cause-list");
    await page.getByRole("button", { name: "Show list" }).click();
    await expect(page.getByText("Choose the court.")).toBeVisible();
  });

  test("F05-H2 advocate day list across the whole complex", async ({ page }) => {
    await page.goto("/cause-list?tab=advocate");
    await expect(page.getByRole("tab", { name: "Advocate, whole complex" })).toHaveAttribute("aria-selected", "true");
    await puneComplex(page);
    await page.getByLabel("Advocate name or bar registration").fill("Kulkarni");
    await page.getByRole("button", { name: "Show list" }).click();
    await expect(page.getByRole("list", { name: "Listed cases" }).getByRole("listitem")).toHaveCount(2);
  });
});

test.describe("F06 scan a case code", () => {
  test("F06-E1 without a QR reader the page falls back to typing", async ({ page }) => {
    await page.addInitScript(() => {
      // simulate a browser without BarcodeDetector
      delete window.BarcodeDetector;
    });
    await page.goto("/cnr/scan");
    await expect(page.getByRole("heading", { name: "Scanning isn't available here" })).toBeVisible();
    await page.getByLabel("CNR number").fill(SEED.todayPune);
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Ramesh Deshmukh/ })).toBeVisible();
    await scan(page);
  });

  test("F06-N1 camera permission denied explains how to fix it", async ({ page }) => {
    await page.addInitScript(() => {
      // minimal stand-in so the page offers the camera
      window.BarcodeDetector = class {
        async detect() {
          return [];
        }
      };
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
    });
    await page.goto("/cnr/scan");
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(page.getByRole("heading", { name: "Camera access is off" })).toBeVisible();
  });
});

test.describe("F07 move saved cases to a new device", () => {
  test("F07-H1 back up, restore on a fresh device, restore again without duplicates", async ({ page, browser }) => {
    await page.goto("/my-cases/backup");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download backup" }).click(),
    ]);
    const file = tmp("backup.json");
    await download.saveAs(file);
    const body = JSON.parse(readFileSync(file, "utf8"));
    expect(body.format).toBe("almirah-backup");
    expect(body.cases).toHaveLength(4);

    // A new browser context is a new device: fresh seed, then restore the file.
    const other = await browser.newContext({ timezoneId: "Asia/Kolkata" });
    const p2 = await other.newPage();
    await p2.goto("/my-cases");
    await p2.getByRole("button", { name: /Remove Ramesh Deshmukh/ }).click();
    await p2.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
    await expect(p2.getByText(/Ramesh Deshmukh vs/)).toHaveCount(0);

    // Both runs match every case by CNR (the fresh device has the same seed), so nothing is ever added twice.
    for (let run = 0; run < 2; run++) {
      await p2.goto("/my-cases/backup");
      await p2.locator("#backup-file").setInputFiles(file);
      await p2.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
      await expect(p2.getByText("Restore complete")).toBeVisible();
      await expect(p2.getByText("0 added · 4 updated · 0 skipped")).toBeVisible();
    }
    await p2.goto("/my-cases");
    await expect(p2.getByText(/Ramesh Deshmukh vs/)).toHaveCount(1);
    await expect(p2.getByRole("main").getByRole("article")).toHaveCount(4);
    await other.close();
  });

  test("F07-N1 a file that isn't a backup is rejected", async ({ page }) => {
    const file = tmp("not-a-backup.json");
    writeFileSync(file, '{"hello": "world"}');
    await page.goto("/my-cases/backup");
    await page.locator("#backup-file").setInputFiles(file);
    await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "isn't a backup" })).toHaveText("That file isn't a backup from this app.");
  });

  test("F07-E1 bad entries are skipped and reported, good ones restored", async ({ page }) => {
    const file = tmp("mixed.json");
    writeFileSync(
      file,
      JSON.stringify({
        format: "almirah-backup",
        version: 1,
        cases: [
          { cnr: "GJAH010000012026", status: "pending", parties: [{ role: "petitioner", name: "Valid Entry" }] },
          { cnr: "nope", status: "pending" },
        ],
      }),
    );
    await page.goto("/my-cases/backup");
    await page.locator("#backup-file").setInputFiles(file);
    await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("1 added · 0 updated · 1 skipped")).toBeVisible();
    await expect(page.getByText("Entry 2 is missing a valid CNR or status.")).toBeVisible();
    await openMyCases(page);
    await expect(page.getByText("Valid Entry")).toBeVisible();
  });
});
