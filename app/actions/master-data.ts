"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin, type Role } from "@/lib/dal";
import { weekDays } from "@/lib/schedule-data";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/appointments";

/**
 * Master data — the doctor list, their availability, and staff roles.
 *
 * Every action starts with requireAdmin(). Server Actions are public POST
 * endpoints, so a staff member who read the bundle could call these directly;
 * the check here is the first of three gates, the others being the
 * "Admins can update ..." RLS policies and the guard_profile_update trigger.
 */

const doctorSchema = z.object({
  name: z.string().trim().min(2, "Enter the doctor's name"),
  specialty: z.string().trim().min(2, "Enter a specialty"),
  serviceSlug: z.enum([
    "developmental-pediatrician",
    "speech-therapy",
    "occupational-therapy",
  ]),
  availableDays: z.array(z.enum(weekDays)).min(1, "Pick at least one day"),
  isActive: z.boolean(),
});

/** Update a doctor's details and availability. */
export async function updateDoctor(
  id: string,
  values: unknown
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = doctorSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("doctors")
    .update({
      name: v.name,
      specialty: v.specialty,
      service_slug: v.serviceSlug,
      available_days: v.availableDays,
      is_active: v.isActive,
    })
    .eq("id", id);

  if (error) {
    // 23505 — service_slug is unique. Two doctors can't own the same service,
    // because that's what makes "Doctor in Charge" resolvable at booking time.
    if (error.code === "23505") {
      return {
        error: "Another doctor is already assigned to that service. Change theirs first.",
      };
    }
    return { error: "Could not save those changes." };
  }

  revalidatePath("/admin/master-data");
  revalidatePath("/admin");
  revalidatePath("/portal");
  return { success: true };
}

/** Add a doctor to the master list. */
export async function createDoctor(values: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = doctorSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("doctors").insert({
    name: v.name,
    specialty: v.specialty,
    service_slug: v.serviceSlug,
    available_days: v.availableDays,
    is_active: v.isActive,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A doctor is already assigned to that service." };
    }
    return { error: "Could not add that doctor." };
  }

  revalidatePath("/admin/master-data");
  return { success: true };
}

/**
 * Point a doctor record at a login account.
 *
 * This is what makes presence possible — without the link there's no way to
 * tell whose session belongs to which doctor. Pass an empty email to unlink.
 */
export async function linkDoctorAccount(
  doctorId: string,
  email: string
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  if (!email.trim()) {
    const { error } = await supabase
      .from("doctors")
      .update({ user_id: null, last_seen_at: null })
      .eq("id", doctorId);
    if (error) return { error: "Could not unlink that account." };
    revalidatePath("/admin/master-data");
    return { success: true };
  }

  // Admins can read profiles (script 10), so this is a direct lookup rather
  // than the narrow find_family_by_email function staff use.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .ilike("email", email.trim())
    .maybeSingle();

  if (!profile) {
    return { error: `No account found for ${email.trim()}. They need to register first.` };
  }

  const { error } = await supabase
    .from("doctors")
    .update({ user_id: profile.id })
    .eq("id", doctorId);

  if (error) {
    // 23505 — user_id is unique; one account can't be two doctors.
    if (error.code === "23505") {
      return { error: "That account is already linked to another doctor." };
    }
    return { error: "Could not link that account." };
  }

  revalidatePath("/admin/master-data");
  return { success: true };
}

/**
 * Change someone's role.
 *
 * The database has the final say: guard_profile_update rejects the change
 * unless is_admin(), and rejects it outright when the target is the caller.
 * That self-exclusion prevents an admin locking everyone out by demoting
 * themselves — so the error below is a real path, not a theoretical one.
 */
export async function setUserRole(
  userId: string,
  role: Role
): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { error: "You can't change your own role. Ask another administrator." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    if (error.code === "23514") {
      return { error: "The database refused that role change." };
    }
    return { error: "Could not update that role." };
  }

  revalidatePath("/admin/master-data");
  return { success: true };
}
