// Stripe webhook handling, kept free of framework and database imports so it can be tested on its own.
// Every handler is idempotent: Stripe retries, and events can arrive twice or out of order.
import type Stripe from "stripe";

export interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: "free" | "pro";
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "unpaid";
  price_paise: number | null;
  currency: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface WebhookDeps {
  alreadyProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string, type: string): Promise<void>;
  userIdForCustomer(customerId: string): Promise<string | null>;
  upsertSubscription(row: SubscriptionRow): Promise<void>;
  retrieveSubscription(id: string): Promise<Stripe.Subscription>;
}

export const HANDLED = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
] as const;

const PAID = new Set(["active", "trialing", "past_due"]);

export function mapStatus(s: Stripe.Subscription.Status): SubscriptionRow["status"] {
  switch (s) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "unpaid":
      return s;
    case "incomplete_expired":
    case "paused":
    default:
      return "canceled";
  }
}

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : v?.id ?? null);

export function rowFromSubscription(sub: Stripe.Subscription, userId: string): SubscriptionRow {
  const item = sub.items?.data?.[0];
  // Newer API versions moved the period end onto the subscription item.
  const periodEnd =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const status = mapStatus(sub.status);
  return {
    user_id: userId,
    stripe_customer_id: idOf(sub.customer)!,
    stripe_subscription_id: sub.id,
    plan: PAID.has(status) ? "pro" : "free",
    status,
    price_paise: item?.price?.unit_amount ?? null,
    currency: (item?.price?.currency ?? "inr").toUpperCase(),
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  };
}

export type WebhookOutcome = "processed" | "duplicate" | "ignored";

export async function handleStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<WebhookOutcome> {
  if (await deps.alreadyProcessed(event.id)) return "duplicate";
  if (!(HANDLED as readonly string[]).includes(event.type)) {
    await deps.markProcessed(event.id, event.type);
    return "ignored";
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
      const subId = idOf(session.subscription);
      if (!userId || !subId) throw new Error(`checkout session ${session.id} has no user or subscription`);
      // Always read the subscription fresh: the event payload can be older than the current state.
      await deps.upsertSubscription(rowFromSubscription(await deps.retrieveSubscription(subId), userId));
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const payload = event.data.object as Stripe.Subscription;
      const userId = payload.metadata?.user_id ?? (await deps.userIdForCustomer(idOf(payload.customer)!));
      if (!userId) throw new Error(`no user for customer ${idOf(payload.customer)}`);
      const sub = event.type === "customer.subscription.deleted" ? payload : await deps.retrieveSubscription(payload.id);
      await deps.upsertSubscription(rowFromSubscription(sub, userId));
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
      const subId =
        idOf(invoice.subscription) ??
        idOf((invoice as unknown as { parent?: { subscription_details?: { subscription?: string } } }).parent?.subscription_details?.subscription);
      const customer = idOf(invoice.customer);
      if (!subId || !customer) break;
      const userId = await deps.userIdForCustomer(customer);
      if (!userId) throw new Error(`no user for customer ${customer}`);
      await deps.upsertSubscription(rowFromSubscription(await deps.retrieveSubscription(subId), userId));
      break;
    }
  }

  await deps.markProcessed(event.id, event.type);
  return "processed";
}
