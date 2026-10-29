import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/billing/stripe";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({ confirm: z.literal("DELETE") });

// Deletes the account for real: cancels billing, removes order files, then the auth user.
// Every table cascades from auth.users, so the database rows go with it.
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });

  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const admin = supabaseAdmin();

  const { data: sub } = await admin.from("subscriptions").select("stripe_subscription_id, status").eq("user_id", user.id).maybeSingle();
  if (sub?.stripe_subscription_id && sub.status !== "canceled") {
    await getStripe().subscriptions.cancel(sub.stripe_subscription_id).catch(() => null);
  }

  // Storage objects don't cascade; list and remove the user's folder in pages.
  const bucket = admin.storage.from("orders");
  const { data: caseFolders } = await bucket.list(user.id, { limit: 1000 });
  for (const folder of caseFolders ?? []) {
    const { data: files } = await bucket.list(`${user.id}/${folder.name}`, { limit: 1000 });
    if (files?.length) await bucket.remove(files.map((f) => `${user.id}/${folder.name}/${f.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Couldn't delete the account. Try again or contact support." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
