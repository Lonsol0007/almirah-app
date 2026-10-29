// Applies the real migration + seed to Postgres (PGlite) and checks the access rules.
// Run: node --test tests/db/
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { freshDb, as as asUser } from "./harness.mjs";

const A = "11111111-1111-4111-a111-111111111111";
const B = "22222222-2222-4222-a222-222222222222";

let db;
const as = (user, sql, params) => asUser(db, user, sql, params);

const demo = JSON.parse(readFileSync("supabase/demo-backup.json", "utf8")).cases[0];

before(async () => {
  db = await freshDb();
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@example.test'), ('${B}', 'b@example.test');`);
});

test("signing up creates a profile", async () => {
  const r = await db.query("select count(*)::int as n from profiles");
  assert.equal(r.rows[0].n, 2);
});

test("reference data is readable by any signed-in user", async () => {
  const r = await as(B, "select count(*)::int as n from court_establishments");
  assert.equal(r.rows[0].n, 25); // 5 district complexes × 4 courts + 5 High Court sides
});

test("upsert_case_tree creates a case with its children", async () => {
  const r = await as(A, "select upsert_case_tree($1::jsonb) as id", [JSON.stringify(demo)]);
  const id = r.rows[0].id;
  const kids = await as(A, "select (select count(*) from parties where case_id=$1)::int p, (select count(*) from case_history where case_id=$1)::int h, (select count(*) from orders where case_id=$1)::int o", [id]);
  assert.deepEqual(kids.rows[0], { p: 2, h: 3, o: 2 });
});

test("restoring the same case twice does not duplicate anything", async () => {
  const first = await as(A, "select upsert_case_tree($1::jsonb) as id", [JSON.stringify(demo)]);
  const again = await as(A, "select upsert_case_tree($1::jsonb) as id", [JSON.stringify(demo)]);
  assert.equal(first.rows[0].id, again.rows[0].id);
  const n = await as(A, "select (select count(*) from cases)::int c, (select count(*) from parties)::int p, (select count(*) from orders)::int o");
  assert.deepEqual(n.rows[0], { c: 1, p: 2, o: 2 });
});

test("a second user gets nothing back", async () => {
  for (const t of ["cases", "parties", "acts", "case_history", "orders", "interim_apps", "case_transfers", "reminders", "subscriptions"]) {
    const r = await as(B, `select count(*)::int as n from ${t}`);
    assert.equal(r.rows[0].n, 0, `user B can see ${t}`);
  }
});

test("a second user cannot change or attach to someone else's case", async () => {
  const caseId = (await db.query("select id from cases limit 1")).rows[0].id;
  const upd = await as(B, "update cases set label = 'hijacked' where id = $1", [caseId]);
  assert.equal(upd.affectedRows, 0);
  const del = await as(B, "delete from cases where id = $1", [caseId]);
  assert.equal(del.affectedRows, 0);
  await assert.rejects(as(B, "insert into parties (case_id, role, name) values ($1, 'petitioner', 'x')", [caseId]));
  await assert.rejects(as(B, `insert into cases (user_id, cnr) values ('${A}', 'ZZZZ000000012024')`));
  const label = (await db.query("select label from cases where id = $1", [caseId])).rows[0].label;
  assert.notEqual(label, "hijacked");
});

test("the same CNR can exist for two different users", async () => {
  await as(B, "select upsert_case_tree($1::jsonb)", [JSON.stringify(demo)]);
  const r = await db.query("select count(*)::int as n from cases where cnr = $1", [demo.cnr]);
  assert.equal(r.rows[0].n, 2);
});

test("bad CNRs are rejected by the database", async () => {
  await assert.rejects(as(A, "select upsert_case_tree($1::jsonb)", [JSON.stringify({ cnr: "short" })]));
});

test("not signed in means no access", async () => {
  await assert.rejects(as(null, "select upsert_case_tree($1::jsonb)", [JSON.stringify(demo)]));
  const r = await as(null, "select count(*)::int as n from cases");
  assert.equal(r.rows[0].n, 0);
});

test("server-only tables and functions are closed to users", async () => {
  await assert.rejects(as(A, "insert into stripe_events (id, type) values ('evt_1', 'x')"));
  await assert.rejects(as(A, "insert into subscriptions (user_id, plan) values ($1, 'pro')", [A]));
  await assert.rejects(as(A, "select * from due_reminders(current_date)"));
  const r = await as(A, "select count(*)::int as n from job_failures");
  assert.equal(r.rows[0].n, 0);
});

test("order files are private to their owner's folder", async () => {
  await as(A, "insert into storage.objects (bucket_id, name) values ('orders', $1)", [`${A}/case/order.pdf`]);
  await assert.rejects(as(B, "insert into storage.objects (bucket_id, name) values ('orders', $1)", [`${A}/case/evil.pdf`]));
  const seen = await as(B, "select count(*)::int as n from storage.objects");
  assert.equal(seen.rows[0].n, 0);
});

test("due_reminders finds tomorrow's hearings for the server", async () => {
  await db.query("update cases set next_hearing_date = current_date + 1 where user_id = $1", [A]);
  const r = await db.query("select user_id, email from due_reminders(current_date)");
  assert.ok(r.rows.some((x) => x.user_id === A && x.email === "a@example.test"));
});

test("deleting an account deletes all of its data", async () => {
  await db.query("delete from auth.users where id = $1", [A]);
  const r = await db.query(
    "select (select count(*) from cases where user_id=$1)::int c, (select count(*) from parties where user_id=$1)::int p, (select count(*) from profiles where id=$1)::int pr",
    [A],
  );
  assert.deepEqual(r.rows[0], { c: 0, p: 0, pr: 0 });
});
