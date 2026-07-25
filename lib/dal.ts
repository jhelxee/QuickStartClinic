import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer — the one place the app asks "who is logged in?".
 *
 * The Next 16 auth guide recommends centralizing auth checks here rather than
 * scattering them, and warns that Server Actions are reachable by direct POST:
 *
 *   "Server Functions are reachable via direct POST requests, not just through
 *    your application's UI. Always verify authentication and authorization
 *    inside every Server Function."
 *
 * So proxy.ts redirecting logged-out users is a convenience, not a control.
 * Every action and every private page calls requireUser() for itself.
 */

/**
 * The current user, or null.
 *
 * React `cache()` dedupes this across a single render pass: a layout, a page,
 * and three components can all call it and only one request reaches Supabase.
 *
 * Always getUser(), never getSession(). getSession() reads the cookie without
 * verifying it, so a forged cookie would pass. getUser() checks with the auth
 * server.
 */
export const getUser = cache(async (): Promise<User | null> => {
  // Before Supabase is configured there is no auth system, so there is no
  // logged-in user. Returning null lets the public pages render instead of
  // crashing the whole site over a missing key.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Same, but redirects to /login instead of returning null. */
export async function requireUser(): Promise<User> {
  // Pages behind this genuinely need the database, so surface the setup error
  // rather than bouncing to a login page that also can't work yet.
  // supabaseUrl() throws with the full instructions.
  if (!isSupabaseConfigured()) supabaseUrl();

  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export interface Profile {
  id: string;
  email: string;
  legal_name: string;
  date_of_birth: string;
  sex: "female" | "male" | "prefer_not_to_say";
  residence: string;
  phone: string;
}

/**
 * The logged-in user's profile row.
 *
 * Note there is no `.eq("id", user.id)` — the RLS policy already restricts this
 * table to the caller's own row. That is the whole point of RLS: forgetting the
 * filter is no longer a data leak.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, legal_name, date_of_birth, sex, residence, phone")
    .single();

  return data as Profile | null;
});
