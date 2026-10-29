// Free plan: 20 saved cases and 10 order files, enforced by the database. Run: node --test tests/db/
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb, as as asUser } from "./harness.mjs";

const FREE = "33333333-3333-4333-a333-333333333333";
const PRO = "44444444-4444-4444-a444-444444444444";
const LAPSED = "55555555-5555-4555-a555-555555555555";

let db;
const as = (user, sql, params) => asUser(db, user, sql, params);
const cnr = (prefix, i) => `${prefix}${String(i).padStart(15, "0")}`;
const add = (user, c) => as(user, "select upsert_case_tree($1::jsonb) as id", [JSON.stringify({ cnr: c, status: "pending" })]);
const saved = async (user) => (await as(user, "select count(*)::int n from cases where saved")).rows[0].n;

before(async () => {
  db = await freshDb();
  await db.exec(`insert into auth.users (id, email) values
    ('${FREE}', 'free@example.test'), ('${PRO}', 'pro@example.test'), ('${LAPSED}', 'lapsed@example.test');`);
  // Plans are written by the server (Stripe webhook), never by the user.
  await db.exec(`insert into subscriptions (user_id, plan, status) values
    ('${PRO}', 'pro', 'active'), ('${LAPSED}', 'free', 'canceled');`);
  // A user can't promote themselves.
  await assert.rejects(as(FREE, "insert into subscriptions (user_id, plan, status) values ($1, 'pro', 'active')", [FREE]));
});

test("free plan: 20 cases fit, the 21st is refused with a clear code", async () => {
  for (let i = 1; i <= 20; i++) await add(FREE, cnr("F", i));
  assert.equal(await saved(FREE), 20);
  await assert.rejects(add(FREE, cnr("F", 21)), /free_plan_case_limit/);
  assert.equal(await saved(FREE), 20);
});

test("at the limit, restoring a case you already have still works", async () => {
  const r = await as(FREE, "select upsert_case_tree($1::jsonb) as id", [
    JSON.stringify({ cnr: cnr("F", 3), status: "pending", stage: "Arguments", parties: [{ role: "petitioner", name: "Restored" }] }),
  ]);
  assert.ok(r.rows[0].id);
  assert.equal(await saved(FREE), 20);
});

test("removing a case frees a slot; re-saving it over the limit is refused", async () => {
  await as(FREE, "update cases set saved = false where cnr = $1", [cnr("F", 1)]);
  await add(FREE, cnr("F", 21));
  assert.equal(await saved(FREE), 20);
  await assert.rejects(as(FREE, "update cases set saved = true where cnr = $1", [cnr("F", 1)]), /free_plan_case_limit/);
});

test("the Advocate plan has no case limit", async () => {
  for (let i = 1; i <= 25; i++) await add(PRO, cnr("P", i));
  assert.equal(await saved(PRO), 25);
});

test("a cancelled plan keeps every case but adds no new ones past 20", async () => {
  // 22 cases added while paid; then the webhook records the cancellation.
  await db.query("update subscriptions set plan = 'pro', status = 'active' where user_id = $1", [LAPSED]);
  for (let i = 1; i <= 22; i++) await add(LAPSED, cnr("L", i));
  await db.query("update subscriptions set plan = 'free', status = 'canceled' where user_id = $1", [LAPSED]);
  assert.equal(await saved(LAPSED), 22);
  await assert.rejects(add(LAPSED, cnr("L", 23)), /free_plan_case_limit/);
  const edit = await as(LAPSED, "update cases set stage = 'Evidence' where cnr = $1", [cnr("L", 5)]);
  assert.equal(edit.affectedRows, 1, "existing cases stay editable");
});

test("free plan: 10 order files, the 11th is refused; file-less entries don't count", async () => {
  const caseId = (await as(FREE, "select id from cases where cnr = $1", [cnr("F", 2)])).rows[0].id;
  for (let i = 1; i <= 10; i++) {
    await as(FREE, "insert into orders (case_id, order_number, storage_path) values ($1, $2, $3)", [caseId, String(i), `${FREE}/${caseId}/${i}.pdf`]);
  }
  await as(FREE, "insert into orders (case_id, order_number) values ($1, 'no file')", [caseId]);
  await assert.rejects(
    as(FREE, "insert into orders (case_id, order_number, storage_path) values ($1, '11', $2)", [caseId, `${FREE}/${caseId}/11.pdf`]),
    /free_plan_order_limit/,
  );
});

test("plan_usage reports what the app shows", async () => {
  const r = await as(FREE, "select * from plan_usage()");
  assert.deepEqual(r.rows[0], { plan: "free", cases: 20, case_limit: 20, order_files: 10, order_file_limit: 10 });
  const p = await as(PRO, "select plan, case_limit from plan_usage()");
  assert.deepEqual(p.rows[0], { plan: "pro", case_limit: null });
});
