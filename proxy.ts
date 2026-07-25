import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/env";

/**
 * Runs before every matched request. Two jobs:
 *
 *   1. Refresh the Supabase auth token and write it back to the cookie, so a
 *      session doesn't expire out from under a browsing user.
 *   2. Redirect logged-out visitors away from private routes before any page
 *      renders — no spinner flash, no protected markup ever sent.
 *
 * NEXT 16 NOTE: this file used to be called `middleware.ts`. In Next 16 that
 * convention is deprecated and renamed to `proxy.ts`, with the exported
 * function renamed from `middleware` to `proxy`. Every Supabase + Next.js guide
 * online still says `middleware.ts` — following one verbatim silently does
 * nothing here, because Next never picks the file up.
 *
 * This is an *optimistic* check: it reads the session and nothing else. The
 * Next docs are explicit that proxy runs on every request including prefetches,
 * so database work belongs in the page, not here. The real guard is
 * requireUser() in lib/dal.ts plus RLS in the database.
 */

// /appointment is deliberately NOT here. It renders AppointmentGate for
// logged-out visitors — a card explaining why an account is needed, with
// Register and Log In buttons. That's friendlier than a bare redirect, and the
// page itself server-checks the session before rendering the booking form.
const PROTECTED_ROUTES = ["/portal"];
const AUTH_ROUTES = ["/login", "/register"];

export default async function proxy(request: NextRequest) {
  // Supabase isn't set up yet. Step aside so the public pages still work
  // instead of 500-ing the entire site over a missing key.
  //
  // This does NOT open a hole: /portal calls requireUser(), which builds its
  // own Supabase client and throws the same setup error. Skipping the proxy
  // check without credentials fails closed at the page, not open.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Supabase passes no-store headers alongside auth cookies. Applying
        // them stops a CDN caching a response that carries someone's session
        // token and serving it to a different visitor.
        for (const [key, headerValue] of Object.entries(headers)) {
          response.headers.set(key, headerValue);
        }
      },
    },
  });

  // Do not remove. getUser() revalidates the token with Supabase and triggers
  // the cookie refresh above. Using getSession() here instead would read an
  // unverified cookie, which is trivially forged.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed so login can send them back.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static assets and image optimization — they don't need a session, and
  // running auth on every icon request would be pure overhead.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};
