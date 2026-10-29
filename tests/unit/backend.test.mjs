// Run: node --test tests/unit/backend.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { handleStripeEvent, mapStatus, rowFromSubscription } from "../../src/lib/billing/webhook.ts";
import { reminderEmail } from "../../src/lib/email/reminder.ts";
import { safeNext } from "../../src/lib/safe-next.ts";
import { googleCalendarUrl } from "../../src/lib/google-calendar.ts";
import { caseRef, consumerRef, isConsumerRef } from "../../src/lib/consumer.ts";
import { buildSeed } from "../../src/lib/data/seed.ts";

const USER = "11111111-1111-4111-a111-111111111111";

function sub(overrides = {}) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    metadata: { user_id: USER },
    items: { data: [{ current_period_end: 1798761600, price: { unit_amount: 49900, currency: "inr" } }] },
    ...overrides,
  };
}

function fakeDeps(subscription = sub()) {
  const seen = new Set();
  const rows = new Map();
  const calls = { upserts: 0, retrieves: 0 };
  return {
    rows,
    calls,
    deps: {
      alreadyProcessed: async (id) => seen.has(id),
      markProcessed: async (id) => void seen.add(id),
      userIdForCustomer: async (c) => (c === "cus_1" ? USER : null),
      upsertSubscription: async (r) => {
        calls.upserts++;
        rows.set(r.user_id, r);
      },
      retrieveSubscription: async () => {
        calls.retrieves++;
        return subscription;
      },
    },
  };
}

const checkoutEvent = {
  id: "evt_checkout",
  type: "checkout.session.completed",
  data: { object: { id: "cs_1", client_reference_id: USER, subscription: "sub_1", metadata: {} } },
};

test("checkout completes → user is on Pro with the period end stored", async () => {
  const { deps, rows } = fakeDeps();
  assert.equal(await handleStripeEvent(checkoutEvent, deps), "processed");
  const row = rows.get(USER);
  assert.equal(row.plan, "pro");
  assert.equal(row.status, "active");
  assert.equal(row.price_paise, 49900);
  assert.equal(row.currency, "INR");
  assert.equal(row.current_period_end, new Date(1798761600 * 1000).toISOString());
});

test("the same event delivered twice is handled once", async () => {
  const { deps, calls } = fakeDeps();
  await handleStripeEvent(checkoutEvent, deps);
  assert.equal(await handleStripeEvent(checkoutEvent, deps), "duplicate");
  assert.equal(calls.upserts, 1);
});

test("cancelling drops the user to Free", async () => {
  const { deps, rows } = fakeDeps();
  await handleStripeEvent(
    { id: "evt_del", type: "customer.subscription.deleted", data: { object: sub({ status: "canceled" }) } },
    deps,
  );
  assert.equal(rows.get(USER).plan, "free");
  assert.equal(rows.get(USER).status, "canceled");
});

test("a failed payment keeps Pro but marks it past due", async () => {
  const { deps, rows } = fakeDeps(sub({ status: "past_due" }));
  await handleStripeEvent(
    { id: "evt_fail", type: "invoice.payment_failed", data: { object: { id: "in_1", customer: "cus_1", subscription: "sub_1" } } },
    deps,
  );
  assert.deepEqual([rows.get(USER).plan, rows.get(USER).status], ["pro", "past_due"]);
});

test("unhandled event types are acknowledged and ignored", async () => {
  const { deps, calls } = fakeDeps();
  assert.equal(await handleStripeEvent({ id: "evt_x", type: "charge.refunded", data: { object: {} } }, deps), "ignored");
  assert.equal(calls.upserts, 0);
});

test("an event for an unknown customer throws so Stripe retries", async () => {
  const { deps } = fakeDeps();
  await assert.rejects(
    handleStripeEvent(
      { id: "evt_u", type: "customer.subscription.updated", data: { object: sub({ customer: "cus_unknown", metadata: {} }) } },
      deps,
    ),
  );
  assert.equal(await deps.alreadyProcessed("evt_u"), false, "a failed event must not be marked processed");
});

test("Stripe statuses map onto the database's allowed values", () => {
  assert.equal(mapStatus("incomplete_expired"), "canceled");
  assert.equal(mapStatus("paused"), "canceled");
  assert.equal(rowFromSubscription(sub({ status: "unpaid" }), USER).plan, "free");
});

test("webhook signatures: valid passes, tampered body fails", () => {
  const stripe = new Stripe("sk_test_dummy");
  const secret = "whsec_test";
  const payload = JSON.stringify(checkoutEvent);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(stripe.webhooks.constructEvent(payload, header, secret).id, "evt_checkout");
  assert.throws(() => stripe.webhooks.constructEvent(payload.replace("evt_checkout", "evt_forged"), header, secret));
});

test("reminder email: one case today, escaped, links to the case", () => {
  const m = reminderEmail({
    brand: "Almirah",
    siteUrl: "https://app.example",
    accent: "#7a1f3d",
    today: "2026-10-28",
    items: [{ caseId: "c1", cnr: "MHPU010004212024", title: "Deshmukh <vs> PMC", hearingDate: "2026-10-28" }],
  });
  assert.equal(m.subject, "Hearing today: Deshmukh <vs> PMC");
  assert.ok(m.html.includes("Deshmukh &lt;vs&gt; PMC"));
  assert.ok(!m.html.includes("<vs>"));
  assert.ok(m.text.includes("https://app.example/case?id=c1"));
});

test("reminder email: several cases become one digest", () => {
  const m = reminderEmail({
    brand: "Almirah",
    siteUrl: "https://app.example",
    accent: "#7a1f3d",
    today: "2026-10-28",
    items: [
      { caseId: "a", cnr: "A".repeat(16), title: "One", hearingDate: "2026-10-29" },
      { caseId: "b", cnr: "B".repeat(16), title: "Two", hearingDate: "2026-10-29" },
    ],
  });
  assert.equal(m.subject, "2 hearings on 29 Oct 2026");
});

test("post-login redirects stay on this site", () => {
  assert.equal(safeNext("/my-cases"), "/my-cases");
  assert.equal(safeNext("https://evil.example"), "/");
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext("/\\evil.example"), "/");
  assert.equal(safeNext(null), "/");
});

test("googleCalendarUrl: all-day event ending the next day, across a month end", () => {
  const u = new URL(googleCalendarUrl({ title: "Hearing: A vs B", date: "2026-10-31", location: "Pune" }));
  assert.equal(u.origin + u.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(u.searchParams.get("action"), "TEMPLATE");
  assert.equal(u.searchParams.get("text"), "Hearing: A vs B");
  assert.equal(u.searchParams.get("dates"), "20261031/20261101");
  assert.equal(u.searchParams.get("location"), "Pune");
  assert.equal(u.searchParams.has("details"), false);
});

test("consumerRef: 16 characters, stable, ignores spacing and case, differs by bench", () => {
  const a = consumerRef("dcdrc-pune-main", "CC/77/2026");
  assert.match(a, /^EJ[A-Z0-9]{14}$/);
  assert.equal(consumerRef("dcdrc-pune-main", " cc / 77 / 2026 "), a);
  assert.notEqual(consumerRef("dcdrc-mumbai-main", "CC/77/2026"), a);
  assert.notEqual(consumerRef("dcdrc-pune-main", "CC/78/2026"), a);
  assert.ok(isConsumerRef(a));
  assert.ok(!isConsumerRef("MHPU010004212024"));
  assert.equal(caseRef({ cnr: a, registrationNumber: "CC/77/2026" }), "CC/77/2026");
  assert.equal(caseRef({ cnr: "MHPU010004212024", registrationNumber: "421/2024" }), "MHPU010004212024");
});

test("the demo consumer case is keyed the way the add-case form would key it", () => {
  const c = buildSeed("2026-10-29").find((x) => x.caseType === "Consumer Complaint");
  assert.equal(c.cnr, consumerRef(c.establishmentId, c.registrationNumber));
});

test("reminder email: consumer cases say e-Jagriti, not a CNR", () => {
  const m = reminderEmail({
    brand: "Almirah", siteUrl: "https://x.test", accent: "#000", today: "2026-10-29",
    items: [{ caseId: "1", cnr: consumerRef("b", "CC/1/2026"), title: "A vs B", hearingDate: "2026-10-29" }],
  });
  assert.match(m.text, /\(e-Jagriti\)/);
  assert.doesNotMatch(m.text, /CNR EJ/);
});
