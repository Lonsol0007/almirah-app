import { NextResponse } from "next/server";
import { customerFor, getStripe } from "@/lib/billing/stripe";
import { SITE_URL, serverEnv } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Starts Stripe Checkout for the Pro plan. No card form of our own, ever.
export async function POST() {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const customer = await customerFor(user.id, user.email);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: serverEnv("STRIPE_PRICE_PRO"), quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${SITE_URL}/account?checkout=done`,
    cancel_url: `${SITE_URL}/account`,
  });
  return NextResponse.json({ url: session.url });
}
