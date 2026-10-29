import "server-only";
import Stripe from "stripe";
import { serverEnv } from "../env";
import { supabaseAdmin } from "../supabase/server";
import type { WebhookDeps } from "./webhook";

let stripe: Stripe | null = null;
export function getStripe() {
  stripe ??= new Stripe(serverEnv("STRIPE_SECRET_KEY"));
  return stripe;
}

/** Finds the user's Stripe customer, creating one the first time. */
export async function customerFor(userId: string, email: string | undefined) {
  const admin = supabaseAdmin();
  const { data } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;
  const customer = await getStripe().customers.create(
    { email, metadata: { user_id: userId } },
    { idempotencyKey: `customer-${userId}` }, // a double click can't create two customers
  );
  const { error } = await admin
    .from("subscriptions")
    .upsert({ user_id: userId, stripe_customer_id: customer.id, plan: "free", status: "active" }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  return customer.id;
}

export function webhookDeps(): WebhookDeps {
  const admin = supabaseAdmin();
  return {
    async alreadyProcessed(id) {
      const { data } = await admin.from("stripe_events").select("id").eq("id", id).maybeSingle();
      return Boolean(data);
    },
    async markProcessed(id, type) {
      const { error } = await admin.from("stripe_events").upsert({ id, type }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    },
    async userIdForCustomer(customerId) {
      const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
      return (data?.user_id as string) ?? null;
    },
    async upsertSubscription(row) {
      const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    },
    retrieveSubscription: (id) => getStripe().subscriptions.retrieve(id),
  };
}
