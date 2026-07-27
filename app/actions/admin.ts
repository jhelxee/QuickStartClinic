"use server";

import { revalidatePath } from "next/cache";

import { sendCancellationEmail, sendRescheduleEmail } from "@/lib/appointment-emails";
import { requireStaff } from "@/lib/dal";
import { labelToSlotTime } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";
import {
  checkPatientInfo,
  doctorSlotBookingSchema,
  rescheduleSchema,
  staffAppointmentSchema,
} from "@/lib/validation";
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
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .select("service, scheduled_date, slot_time, contact_email, guardian_name")
    .single();

  if (error) {
    // 23514 = the guard trigger refused the transition, e.g. reopening a
    // booking that was already completed or cancelled.
    if (error.code === "23514") {
      return { error: "That appointment is closed and can't be changed." };
    }
    return { error: "Could not update that appointment. Please try again." };
  }

  // Only cancellation gets an email here — approving/completing aren't in
  // scope for this notification pass.
  if (status === "cancelled") {
    await sendCancellationEmail({
      to: data.contact_email,
      guardianName: data.guardian_name,
      service: data.service,
      date: data.scheduled_date,
      time: data.slot_time,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/portal");
  return { success: true };
}

/**
 * Reschedule any appointment, as clinic staff.
 *
 * Unlike a patient's own rescheduleAppointment, this doesn't force the row
 * back to pending — guard_appointment_update lets staff through entirely
 * (see migration 15), because staff moving a booking IS the confirmation.
 * Not scoped to a particular user_id: staff can move any family's booking,
 * same as setAppointmentStatus above.
 */
export async function rescheduleAppointmentAsStaff(
  id: string,
  values: unknown
): Promise<ActionResult> {
  await requireStaff();

  const parsed = rescheduleSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please choose a valid date and time." };
  }
  const v = parsed.data;

  const slotTime = labelToSlotTime(v.preferredTime);
  if (!slotTime) {
    return { error: "That appointment time isn't one we offer." };
  }

  const supabase = await createClient();

  const { data: before } = await supabase
    .from("appointments")
    .select("scheduled_date, slot_time, service, status, contact_email, guardian_name")
    .eq("id", id)
    .single();

  if (!before) {
    return { error: "We couldn't find that appointment." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ scheduled_date: v.preferredDate, slot_time: slotTime })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That doctor is already booked at that time." };
    }
    if (error.code === "23514") {
      return { error: "We can't schedule that date or time. Please choose another." };
    }
    return { error: "We couldn't reschedule that appointment. Please try again." };
  }

  await sendRescheduleEmail({
    to: before.contact_email,
    guardianName: before.guardian_name,
    service: before.service,
    oldDate: before.scheduled_date,
    oldTime: before.slot_time,
    newDate: v.preferredDate,
    newTime: slotTime,
    // Staff rescheduling doesn't change status — the trigger lets them
    // through untouched (see migration 15) — so whatever it already needed
    // still applies.
    needsConfirmation: before.status === "pending",
  });

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

  // "Doctor in Charge" — same resolver as the patient-facing booking flow.
  // See resolve_doctor() in supabase/migrations/13_multi_doctor_per_service.sql
  // and the matching comment in app/actions/appointments.ts for the retry
  // rationale.
  async function attemptInsert() {
    const { data: doctorId } = await supabase.rpc("resolve_doctor", {
      p_user_id: ownerId,
      p_service: v.service,
      p_date: v.preferredDate,
      p_time: slotTime,
    });

    if (!doctorId) return { doctorId: null as string | null, error: null };

    const { error } = await supabase.from("appointments").insert({
      user_id: ownerId, // null = staff-only record
      doctor_id: doctorId,
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
      // Staff bookings start confirmed — someone already agreed the time by phone.
      status: "approved",
    });

    return { doctorId, error };
  }

  let { doctorId, error } = await attemptInsert();
  if (doctorId && error?.code === "23505") {
    ({ doctorId, error } = await attemptInsert()); // one designed retry
  }

  if (!doctorId) {
    return { error: "That service has no doctor available at that time." };
  }

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

/**
 * Record a booking from the click-to-book grid.
 *
 * The doctor, service, date, and time are already fixed by which cell was
 * clicked — this does not call resolve_doctor() at all. Clicking a specific
 * doctor's row IS the doctor selection, made once, upstream of this action;
 * there is still no dropdown anywhere.
 */
export async function createDoctorAppointment(
  doctorId: string,
  serviceSlug: string,
  scheduledDate: string,
  slotTimeLabel: string,
  values: unknown
): Promise<ActionResult> {
  await requireStaff();

  const parsed = doctorSlotBookingSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Some details look incomplete. Please check the form." };
  }
  const v = parsed.data;

  if (checkPatientInfo(v)) {
    return { error: "Please provide the patient's date of birth or age." };
  }

  const slotTime = labelToSlotTime(slotTimeLabel);
  if (!slotTime) {
    return { error: "That appointment time isn't one we offer." };
  }

  const supabase = await createClient();

  let ownerId: string | null = null;
  if (v.hasAccount) {
    if (!v.familyEmail) {
      return { error: 'Enter the family\'s account email, or switch to "No account".' };
    }
    const { data: matches } = await supabase.rpc("find_family_by_email", {
      lookup_email: v.familyEmail,
    });
    const family = (matches ?? []) as { id: string }[];
    if (family.length === 0) {
      return { error: `No account found for ${v.familyEmail}.` };
    }
    ownerId = family[0].id;
  }

  // Trusts doctorId/serviceSlug from the click rather than re-resolving —
  // that trust is bounded here by requireStaff() above and this guard: the
  // clicked doctor must still actually offer the clicked service and still
  // be active. Closes the gap where a stale or mismatched client payload
  // could otherwise insert a booking under a doctor who doesn't serve that
  // specialty.
  const { data: doctorRow } = await supabase
    .from("doctors")
    .select("id")
    .eq("id", doctorId)
    .eq("service_slug", serviceSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!doctorRow) {
    return { error: "That doctor is no longer available for this service." };
  }

  const { error } = await supabase.from("appointments").insert({
    user_id: ownerId,
    doctor_id: doctorId,
    service: serviceSlug,
    patient_name: v.patientName,
    patient_dob: v.patientInfoType === "dob" ? v.patientDob : null,
    patient_age: v.patientInfoType === "age" ? Number(v.patientAge) : null,
    guardian_name: v.guardianName,
    contact_phone: v.phone,
    contact_email: v.email,
    scheduled_date: scheduledDate,
    slot_time: slotTime,
    notes: v.notes?.trim() ? v.notes : null,
    status: "approved",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That slot was just taken. Please pick another." };
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
