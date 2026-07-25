"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/dal";
import { labelToSlotTime } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";
import { checkPatientInfo, staffAppointmentSchema } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/appointments";

/** Statuses staff may set. Patients get 'cancelled' only, via cancelAppointment. */
export type StaffStatus = "approved" | "completed" | "cancelled";

const ALLOWED: StaffStatus[] = ["approved", "completed", "cancelled"];

/**
 * Move an appointment to a new status as clinic staff.
 *
 * Three independent things have to agree before this succeeds, which is the
 * point — no single mistake opens a hole:
 *
 *   1. requireStaff() here, so a patient calling this action directly bounces
 *   2. The "Staff can update all appointments" RLS policy, so the database
 *      returns nothing to a non-staff caller regardless of what this code does
 *   3. The guard_appointment_update trigger, which only lets the transition
 *      through when public.is_staff() is true
 *
 * A Server Action is a public POST endpoint — it is reachable without going
 * near the admin page — so step 1 is not optional.
 */
export async function setAppointmentStatus(
  id: string,
  status: StaffStatus
): Promise<ActionResult> {
  await requireStaff();

  // Never trust a status string off the wire, even from a staff session.
  if (!ALLOWED.includes(status)) {
    return { error: "That isn't a status we recognise." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);

  if (error) {
    // 23514 = the guard trigger refused the transition, e.g. reopening a
    // booking that was already completed or cancelled.
    if (error.code === "23514") {
      return { error: "That appointment is closed and can't be changed." };
    }
    return { error: "Could not update that appointment. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/portal");
  return { success: true };
}

/**
 * Record a booking taken over the phone or at the desk.
 *
 * If `familyEmail` matches a registered account, the appointment is attached to
 * it and shows up in that family's own portal. Otherwise it is stored with
 * `user_id = null` — a staff-only record, which is the normal case for someone
 * who has never used the website.
 */
export async function createStaffAppointment(values: unknown): Promise<ActionResult> {
  await requireStaff();

  const parsed = staffAppointmentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Some details look incomplete. Please check the form." };
  }
  const v = parsed.data;

  if (checkPatientInfo(v)) {
    return { error: "Please provide the patient's date of birth or age." };
  }

  const slotTime = labelToSlotTime(v.preferredTime);
  if (!slotTime) {
    return { error: "That appointment time isn't one we offer." };
  }

  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("service_slug", v.service)
    .single();

  if (!doctor) {
    return { error: "That service isn't available right now." };
  }

  // Optional: attach to an existing account so the family sees it in their
  // portal. Uses the narrow lookup function rather than reading profiles.
  let ownerId: string | null = null;
  if (v.familyEmail) {
    const { data: matches } = await supabase.rpc("find_family_by_email", {
      lookup_email: v.familyEmail,
    });
    const family = (matches ?? []) as { id: string }[];
    if (family.length === 0) {
      return {
        error: `No account found for ${v.familyEmail}. Leave it blank to record this as a phone booking.`,
      };
    }
    ownerId = family[0].id;
  }

  const { error } = await supabase.from("appointments").insert({
    user_id: ownerId, // null = staff-only record
    doctor_id: doctor.id,
    service: v.service,
    patient_name: v.patientName,
    patient_dob: v.patientInfoType === "dob" ? v.patientDob : null,
    patient_age: v.patientInfoType === "age" ? Number(v.patientAge) : null,
    guardian_name: v.guardianName,
    contact_phone: v.phone,
    contact_email: v.email,
    scheduled_date: v.preferredDate,
    slot_time: slotTime,
    notes: v.notes?.trim() ? v.notes : null,
    // booked_by_staff is stamped by the database, not trusted from here.
    // Staff bookings start confirmed — someone already agreed the time by phone.
    status: "approved",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That doctor is already booked at that time." };
    }
    if (error.code === "23514") {
      return { error: "We can't schedule that date or time. Please choose another." };
    }
    return { error: "Could not save that booking. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/portal");
  return { success: true };
}
