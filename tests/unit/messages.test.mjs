// Run: node --test tests/unit/messages.test.mjs
// Every language has every message, none is empty, and placeholders like {n} match English exactly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MESSAGES } from "../../src/lib/i18n/messages.ts";

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

for (const [lang, table] of Object.entries(MESSAGES)) {
  test(`${lang}: complete, non-empty, placeholders match English`, () => {
    for (const [key, en] of Object.entries(MESSAGES.en)) {
      const s = table[key];
      assert.equal(typeof s, "string", `${lang}.${key} missing`);
      assert.ok(s.trim().length > 0, `${lang}.${key} empty`);
      assert.equal(placeholders(s), placeholders(en), `${lang}.${key} placeholders`);
    }
    assert.deepEqual(Object.keys(table).sort(), Object.keys(MESSAGES.en).sort(), `${lang} has extra or missing keys`);
  });
}

test("Hindi and Marathi aren't just English copied over", () => {
  for (const lang of ["hi", "mr"]) {
    const same = Object.keys(MESSAGES.en).filter((k) => MESSAGES[lang][k] === MESSAGES.en[k] && /[a-z]{4}/.test(MESSAGES.en[k]));
    assert.ok(same.length <= 3, `${lang} has ${same.length} untranslated: ${same.join(", ")}`);
  }
});
