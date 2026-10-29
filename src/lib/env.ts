// Public config is inlined at build time. With no Supabase URL the app runs in demo mode on the fake data layer.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

export const backendEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Server-only secrets. Throws a clear error when a route needs one that isn't set. */
export function serverEnv(name: "SUPABASE_SERVICE_ROLE_KEY" | "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "STRIPE_PRICE_PRO" | "RESEND_API_KEY" | "EMAIL_FROM" | "CRON_SECRET") {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  return v;
}
