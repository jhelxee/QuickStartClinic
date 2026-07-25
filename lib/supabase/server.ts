import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Supabase client for Server Components, Server Actions, and route handlers.
 *
 * The session lives in an httpOnly cookie, so this client has to be able to
 * read it (to know who is asking) and write it (to persist a refreshed token).
 *
 * Next 16 note: `cookies()` is async and must be awaited — hence this function
 * being async too. Older tutorials call it synchronously and will not work here.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies — Next throws if you try.
          // That's harmless here: proxy.ts refreshes the session on every
          // request, so the cookie is already up to date by the time a page
          // renders. This catch only swallows the write, never a read.
        }
      },
    },
  });
}
