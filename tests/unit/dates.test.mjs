// Run: node --test tests/unit/dates.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { daysUntil, formatDate, formatInstant, formatLongDay, hearingLabel, todayIST } from "../../src/lib/dates.ts";

test("court 'today' follows IST, not the device clock", () => {
  assert.equal(todayIST(new Date("2026-10-28T18:29:00Z")), "2026-10-28"); // 23:59 IST
  assert.equal(todayIST(new Date("2026-10-28T18:30:00Z")), "2026-10-29"); // 00:00 IST
});

test("day maths ignores clock changes elsewhere (e.g. US daylight saving ending 1 Nov 2026)", () => {
  assert.equal(daysUntil("2026-11-02", "2026-10-31"), 2);
  assert.equal(daysUntil("2027-03-15", "2027-03-13"), 2);
});

test("formatting is fixed, so server and browser render the same text", () => {
  assert.equal(formatDate("2026-10-28"), "28 Oct 2026");
  assert.equal(formatLongDay("2026-10-29"), "Thursday, 29 October");
  assert.equal(formatInstant("2026-10-28T04:30:00Z"), "28 Oct 2026, 10:00");
});

test("hearing labels", () => {
  assert.equal(hearingLabel("2026-10-28", "2026-10-28"), "Hearing today");
  assert.equal(hearingLabel("2026-10-29", "2026-10-28"), "Hearing tomorrow");
  assert.equal(hearingLabel("2026-10-20", "2026-10-28"), "Date passed · 20 Oct 2026");
  assert.equal(hearingLabel(undefined, "2026-10-28"), "No date set");
});
