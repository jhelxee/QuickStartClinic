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

/**
 * client — a family. Sees only their own appointments.
 * staff  — coordinator. Sees every booking, plus their own client portal.
 * doctor — clinician. Same clinic-side access as staff; their session drives
 *          the "in clinic" indicator patients see.
 * admin  — administrator. Clinic-side access plus master data (doctor list,
 *          availability, staff roles). No client portal at all.
 */
export type Role = "client" | "staff" | "doctor" | "admin";

export interface Profile {
  id: string;
  email: string;
  legal_name: string;
  date_of_birth: string;
  sex: "female" | "male" | "prefer_not_to_say";
  residence: string;
  phone: string;
  role: Role;
}

/**
 * The logged-in user's profile row.
 *
 * The `.eq("id", user.id)` is load-bearing, and it did not used to be.
 *
 * Originally the only SELECT policy on `profiles` was "you may read your own
 * row", so this query could not return more than one result and the filter was
 * genuinely redundant. Script 10 then added "Admins can view all profiles" —
 * and for an admin this query started returning EVERY profile, at which point
 * .single() fails with "multiple rows returned" and the profile silently
 * becomes null. The visible symptom was "Welcome back, there." and admins being
 * bounced out of /admin by requireStaff().
 *
 * The lesson: "RLS already narrows this" is a statement about the policies that
 * exist today. Widening a policy later can turn a safe query into a broken one,
 * so scope the query by hand as well.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, legal_name, date_of_birth, sex, residence, phone, role")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
});

/** Logged-out visitors are treated as clients — they can see nothing either way. */
export async function getRole(): Promise<Role> {
  const profile = await getProfile();
  return profile?.role ?? "client";
}

/** Everyone who works the clinic side. Doctors are staff, per the role design. */
export function isClinicSide(role: Role): boolean {
  return role === "staff" || role === "doctor" || role === "admin";
}

/**
 * Where a user belongs immediately after signing in.
 *
 * Staff and admin go straight to the Staff View — no button click, which is the
 * whole point of the role. Clients keep the family portal.
 */
export function landingPathFor(role: Role): "/admin" | "/portal" {
  return isClinicSide(role) ? "/admin" : "/portal";
}

/**
 * Guard for the clinic-side area.
 *
 * Sends clients back to their own portal rather than showing a 403 — there's no
 * reason to confirm to a family that a staff area exists.
 *
 * This is a convenience check, not the security boundary. Even if someone
 * reached /admin, the RLS policies decide what the database will actually
 * return, and the guard_appointment_update trigger decides what it will accept.
 */
export async function requireStaff(): Promise<Profile> {
  await requireUser();
  const profile = await getProfile();
  if (!profile || !isClinicSide(profile.role)) redirect("/portal");
  return profile;
}

/**
 * Guard for master data — the doctor list, availability, and staff roles.
 *
 * Admin only. Staff and doctors get bounced to the clinic dashboard they do
 * have access to. As always this is the convenient check, not the real one:
 * the "Admins can update doctors" and "Admins can update all profiles"
 * policies, plus the role rules in guard_profile_update, are what actually
 * hold if someone calls the API directly.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect("/admin");
  return profile;
}

/** A doctor's live clinic presence, as patients are allowed to see it. */
export interface DoctorPresence {
  doctor_id: string;
  name: string;
  specialty: string;
  service_slug: string;
  available_days: string[];
  in_clinic: boolean;
}

/**
 * Doctor list with live presence.
 *
 * Goes through the doctor_presence() function rather than reading `doctors`
 * directly, because that function returns a boolean instead of the underlying
 * last_seen_at timestamp — patients get "here or not", not a minute-by-minute
 * record of when each clinician arrives, breaks, and leaves.
 */
export const getDoctorPresence = cache(async (): Promise<DoctorPresence[]> => {
  const user = await getUser();
  if (!user) return []; // the function is granted to authenticated only

  const supabase = await createClient();
  const { data } = await supabase.rpc("doctor_presence");
  return (data ?? []) as DoctorPresence[];
});

/** Every active doctor, no presence — safe for a logged-out visitor. */
export interface DoctorRosterEntry {
  id: string;
  name: string;
  specialty: string;
  service_slug: string;
  available_days: string[];
  photo_url: string | null;
}

/**
 * The public doctor roster for the marketing site.
 *
 * Unlike getDoctorPresence(), this works for logged-out visitors — the whole
 * point is that "Meet the team" has to render for everyone, not just signed-in
 * patients. Goes through doctor_roster() (granted to anon), never reads
 * `doctors` directly — same narrow-columns discipline as every other doctor
 * function here.
 */
export const getDoctorRoster = cache(async (): Promise<DoctorRosterEntry[]> => {
  // Same reasoning as getUser(): a fresh, not-yet-configured project should
  // still render the public marketing page instead of crashing over a
  // missing key.
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase.rpc("doctor_roster");
  return (data ?? []) as DoctorRosterEntry[];
});

/**
 * How many contact-form messages are still unread.
 *
 * Shared by every /admin/* page so the count can show as a badge in
 * SiteHeader regardless of which admin page someone is on — not just the
 * main dashboard, which is the only place that used to compute it. The
 * "Staff can view inquiries" RLS policy is what actually restricts this to
 * staff; the !user check here is just the same defensive habit as
 * getDoctorPresence.
 */
export const getNewInquiriesCount = cache(async (): Promise<number> => {
  const user = await getUser();
  if (!user) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("contact_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return count ?? 0;
});
