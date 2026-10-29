import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, backendEnabled } from "@/lib/env";

const PUBLIC = ["/welcome", "/icon.svg", "/screens/", "/login", "/auth/", "/api/webhooks/", "/api/jobs/", "/privacy", "/terms"];

export async function proxy(req: NextRequest) {
  if (!backendEnabled) return NextResponse.next(); // demo mode: everything is local, nothing to protect

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  // getUser() revalidates the token with Supabase and refreshes the cookie when needed.
  const { data } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  if (!data.user && !PUBLIC.some((p) => path === p || path.startsWith(p))) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const url = req.nextUrl.clone();
    // Signed-out visitors to the root see the landing page; deep links go to sign-in and come back.
    url.pathname = path === "/" ? "/welcome" : "/login";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|ico|json|webmanifest)$).*)"],
};
