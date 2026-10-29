import { NextResponse, type NextRequest } from "next/server";
import { getStripe, webhookDeps } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/webhook";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  // The signature covers the raw body, so read it as text before any parsing.
  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, serverEnv("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  try {
    const outcome = await handleStripeEvent(event, webhookDeps());
    return NextResponse.json({ received: true, outcome });
  } catch (err) {
    // A 500 makes Stripe retry later; the handler is safe to run again.
    console.error("stripe webhook failed", event.id, event.type, (err as Error).message);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
