"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Keeps a signed-in doctor marked as "in clinic".
 *
 * WHY A HEARTBEAT AND NOT A LOGIN FLAG
 * Supabase sessions last weeks and refresh themselves, and people close tabs
 * instead of clicking Log Out. If presence were "has a valid session", a doctor
 * who signed in once on their phone would show as being in the clinic at 3am,
 * forever. Patients would act on that.
 *
 * So the database stores a timestamp, not a boolean, and this component
 * refreshes it while the doctor actually has the app open. Stop refreshing —
 * closed laptop, dead wifi, crashed tab — and presence expires on its own after
 * five minutes. Nothing has to succeed for the status to become correct again,
 * which is the property a boolean flag can never have.
 *
 * Renders nothing. Mount it once, inside a doctor-only branch.
 */
const HEARTBEAT_MS = 60_000;

export function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function beat() {
      // Don't claim presence for a backgrounded tab left open overnight — the
      // point is that the doctor is actually here.
      if (cancelled || document.visibilityState !== "visible") return;
      await supabase.rpc("touch_presence");
    }

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    // Coming back to the tab should update the badge immediately, not after up
    // to a minute of looking stale.
    document.addEventListener("visibilitychange", beat);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  return null;
}
