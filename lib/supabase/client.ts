import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Supabase client for Client Components (anything with "use client").
 *
 * Uses the anon key, which is public by design — it ships in the browser
 * bundle and anyone can read it. That is fine: Row Level Security, not key
 * secrecy, is what keeps patient data private. See
 * supabase/migrations/04_rls_policies.sql.
 *
 * For Server Components, Server Actions, and proxy.ts, use lib/supabase/server.ts
 * instead — those need to read and write the session cookie.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
