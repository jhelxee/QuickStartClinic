import type { User } from "@supabase/supabase-js";

/**
 * The minimal identity the UI renders — a display name and an email.
 *
 * This lives in its own module, deliberately WITHOUT "use client", because both
 * sides need it: the root layout (a Server Component) derives the initial value
 * to hand to AuthProvider, and AuthProvider (a Client Component) re-derives it
 * whenever the session changes.
 *
 * Keeping it in auth-context.tsx doesn't work — that file is marked
 * "use client", and Next refuses to let the server call a function from a
 * client module ("Attempted to call toPatient() from the server").
 */
export interface Patient {
  name: string;
  email: string;
}

/** "jordan.carter@example.com" -> "Jordan Carter" */
function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const words = local.split(/[._-]+/).filter(Boolean);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * legal_name is written into the auth user's metadata at signup, so the display
 * name is available without a database round trip on every page. Falls back to
 * the email local-part for accounts created before that metadata existed.
 */
export function toPatient(user: User | null): Patient | null {
  if (!user) return null;
  const email = user.email ?? "";
  const legalName = (user.user_metadata?.legal_name as string | undefined)?.trim();
  return { name: legalName || nameFromEmail(email), email };
}
