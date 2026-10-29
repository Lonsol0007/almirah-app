import { NextResponse } from "next/server";
import { customerFor, getStripe } from "@/lib/billing/stripe";
import { SITE_URL } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Stripe's Customer Portal: change card, see invoices, cancel in one click.
export async function POST() {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const session = await getStripe().billingPortal.sessions.create({
    customer: await customerFor(user.id, user.email),
    return_url: `${SITE_URL}/account`,
  });
  return NextResponse.json({ url: session.url });
}
