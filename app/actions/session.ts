"use server";

import { getRole, landingPathFor } from "@/lib/dal";

/**
 * Where the just-signed-in user should land.
 *
 * The login form runs in the browser and has no idea what role the account
 * holds — role lives in `profiles`, which RLS only lets the server read on the
 * user's behalf. So the client asks after a successful sign-in.
 *
 * This is a routing convenience, not access control. Returning "/admin" to
 * someone doesn't grant them anything: requireStaff() re-checks on that page,
 * and the RLS policies decide what the database will actually hand over.
 */
export async function resolveLandingPath(): Promise<"/admin" | "/portal"> {
  return landingPathFor(await getRole());
}
