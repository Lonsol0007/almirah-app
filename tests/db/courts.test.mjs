// High Court reference data and the court-level preference. Run: node --test tests/db/courts.test.mjs
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb, as as asUser } from "./harness.mjs";

const U = "66666666-6666-4666-a666-666666666666";
let db;
const as = (sql, params) => asUser(db, U, sql, params);

before(async () => {
  db = await freshDb();
  await db.exec(`insert into auth.users (id, email) values ('${U}', 'u@example.test');`);
});

test("High Court benches are seeded as their own kind, with their sides", async () => {
  const r = await as(`select c.name, count(e.id)::int sides from court_complexes c
    join court_establishments e on e.complex_id = c.id where c.kind = 'high_court' group by c.name order by c.name`);
  assert.deepEqual(r.rows, [
    { name: "Bombay High Court, Bench at Nagpur", sides: 1 },
    { name: "Bombay High Court, Principal Seat", sides: 2 },
    { name: "High Court of Delhi", sides: 1 },
    { name: "High Court of Karnataka, Principal Bench", sides: 1 },
  ]);
});

test("district complexes are unchanged", async () => {
  const r = await as("select count(*)::int n from court_complexes where kind = 'district'");
  assert.equal(r.rows[0].n, 5);
});

test("court level defaults to district, can be set to high, rejects anything else", async () => {
  assert.equal((await as("select court_level from profiles where id = $1", [U])).rows[0].court_level, "district");
  await as("update profiles set court_level = 'high' where id = $1", [U]);
  assert.equal((await as("select court_level from profiles where id = $1", [U])).rows[0].court_level, "high");
  await assert.rejects(as("update profiles set court_level = 'supreme' where id = $1", [U]));
});
