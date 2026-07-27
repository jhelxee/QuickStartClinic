"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, type Role } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { doctorSchema, serviceLabel } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/appointments";

/**
 * Master data — the doctor list, their availability, and staff roles.
 *
 * Every action starts with requireAdmin(). Server Actions are public POST
 * endpoints, so a staff member who read the bundle could call these directly;
 * the check here is the first of three gates, the others being the
 * "Admins can update ..." RLS policies and the guard_profile_update trigger.
 */

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
      // Derived, not user-entered — see the comment on doctorSchema.
      specialty: serviceLabel(v.serviceSlug),
      service_slug: v.serviceSlug,
      available_days: v.availableDays,
      is_active: v.isActive,
      photo_url: v.photoUrl?.trim() ? v.photoUrl : null,
    })
    .eq("id", id);

  if (error) {
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
    // Derived, not user-entered — see the comment on doctorSchema.
    specialty: serviceLabel(v.serviceSlug),
    service_slug: v.serviceSlug,
    available_days: v.availableDays,
    is_active: v.isActive,
    photo_url: v.photoUrl?.trim() ? v.photoUrl : null,
  });

  if (error) {
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
 *
 * This is also the ONLY place a profile's role becomes (or stops being)
 * "doctor" — Staff Access no longer offers Doctor as a manual choice, so
 * linking/unlinking here is the full lifecycle: it promotes on link, and
 * demotes back to client on unlink. See StaffAccessTable for the other side
 * of that removal.
 */
export async function linkDoctorAccount(
  doctorId: string,
  email: string
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  if (!email.trim()) {
    // Look up who's currently linked before clearing it, so their role can
    // be reverted too — the row about to be nulled is the only place that's
    // recorded.
    const { data: doctor } = await supabase
      .from("doctors")
      .select("user_id")
      .eq("id", doctorId)
      .maybeSingle();

    const { error } = await supabase
      .from("doctors")
      .update({ user_id: null, last_seen_at: null })
      .eq("id", doctorId);
    if (error) return { error: "Could not unlink that account." };

    // Only step them back down from "doctor" specifically — if an admin had
    // since changed them to something else for their own reasons, unlinking
    // a stale doctor record shouldn't clobber that.
    if (doctor?.user_id) {
      await supabase
        .from("profiles")
        .update({ role: "client" })
        .eq("id", doctor.user_id)
        .eq("role", "doctor");
    }

    revalidatePath("/admin/master-data");
    revalidatePath("/admin");
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

  // Only promote from "client" — never silently downgrade an existing staff
  // member or admin who happens to also be getting linked as a doctor. They
  // keep whatever access they already had; the account just also gains a
  // doctor record.
  if (profile.role === "client") {
    await supabase.from("profiles").update({ role: "doctor" }).eq("id", profile.id);
  }

  revalidatePath("/admin/master-data");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Change someone's role.
 *
 * The database has the final say: guard_profile_update rejects the change
 * unless is_admin(), and rejects it outright when the target is the caller.
 * That self-exclusion prevents an admin locking everyone out by demoting
 * themselves — so the error below is a real path, not a theoretical one.
 *
 * "doctor" is deliberately not settable here — see linkDoctorAccount above,
 * which is the only path that grants or revokes it. A Server Action is a
 * public POST endpoint, so this has to be enforced here too, not just by
 * StaffAccessTable no longer offering it as a dropdown choice.
 */
export async function setUserRole(
  userId: string,
  role: Role
): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { error: "You can't change your own role. Ask another administrator." };
  }

  if (role === "doctor") {
    return {
      error: "Doctor access is set by linking an account in Master Data → Doctors, not here.",
    };
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
