"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { toPatient, type Patient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type { Patient };

interface AuthContextValue {
  patient: Patient | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

/**
 * Client-side view of the session.
 *
 * This is for RENDERING ONLY — showing a name in the header, swapping Log In
 * for Log Out. It is not a security boundary and must never be the only thing
 * standing between a visitor and private data. Real enforcement is:
 *
 *   1. RLS in Postgres  — the database refuses to return other people's rows
 *   2. requireUser()    — every Server Action and private page checks for itself
 *   3. proxy.ts         — redirects logged-out visitors before a page renders
 *
 * `initialUser` comes from the server on first render, so the header and portal
 * are correct in the very first HTML — no logged-out flash, no spinner while
 * the client works out who you are. After that, onAuthStateChange keeps it
 * current (including sign-out in another tab).
 */

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: Patient | null;
}) {
  const router = useRouter();
  // null until Supabase is configured, so the public pages still render while
  // you're still filling in .env.local.
  const supabase = useMemo(
    () => (isSupabaseConfigured() ? createClient() : null),
    []
  );
  const [patient, setPatient] = useState<Patient | null>(initialUser);

  // Re-sync when a server re-render reports a different session — e.g. after
  // router.refresh() following sign-in or sign-out. Adjusting state during
  // render rather than in an effect is React's documented pattern for this;
  // an effect would cause a cascading second render every time.
  const [syncedEmail, setSyncedEmail] = useState(initialUser?.email ?? null);
  const serverEmail = initialUser?.email ?? null;
  if (syncedEmail !== serverEmail) {
    setSyncedEmail(serverEmail);
    setPatient(initialUser);
  }

  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setPatient(toPatient(session?.user ?? null));
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const logout = useCallback(async () => {
    await supabase?.auth.signOut();
    setPatient(null);
    // Rerun the server components so the session cookie is re-read and any
    // cached private data is dropped.
    router.refresh();
  }, [supabase, router]);

  const value = useMemo(
    () => ({ patient, isAuthenticated: !!patient, logout }),
    [patient, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
