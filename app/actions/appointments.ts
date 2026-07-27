"use server";

import { revalidatePath } from "next/cache";

import {
  sendBookingConfirmationEmail,
  sendCancellationEmail,
  sendRescheduleEmail,
} from "@/lib/appointment-emails";
import { requireUser } from "@/lib/dal";
import { labelToSlotTime } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";
import {
  appointmentSchema,
  checkPatientInfo,
  clientSlotBookingSchema,
  rescheduleSchema,
} from "@/lib/validation";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

/**
 * Book an appointment.
 *
 * A Server Action is a public POST endpoint — anyone can call it directly,
 * bypassing the form entirely. So this re-runs the same Zod validation the
 * browser ran, and takes user_id from the verified session rather than from
 * anything the caller sent.
 */
export async function createAppointment(values: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = appointmentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Some details look incomplete. Please check the form." };
  }
  const v = parsed.data;

  // The DOB-or-age rule lives outside the schema (see lib/validation.ts), so it
  // has to be re-run here too.
  if (checkPatientInfo(v)) {
    return { error: "Please provide the patient's date of birth or age." };
  }

  const slotTime = labelToSlotTime(v.preferredTime);
  if (!slotTime) {
    return { error: "That appointment time isn't one we offer." };
  }

  const supabase = await createClient();

  // "Doctor in Charge" — the patient's usual doctor for this service if one
  // applies and is free, otherwise whoever's least booked this week. See
  // resolve_doctor() in supabase/migrations/13_multi_doctor_per_service.sql.
  //
  // resolve_doctor() does one atomic read with no lock, so two families
  // resolving to the same doctor+slot in the same instant is possible, if
  // rare — that's a real double-booking race, not a resolver bug, and
  // appointments_no_double_booking is what actually prevents it. One retry
  // (re-resolve, re-insert) clears it without surfacing an error for
  // something that isn't really "no doctor available".
  async function attemptInsert() {
    const { data: doctorId } = await supabase.rpc("resolve_doctor", {
      p_user_id: user.id,
      p_service: v.service,
      p_date: v.preferredDate,
      p_time: slotTime,
    });

    if (!doctorId) return { doctorId: null as string | null, error: null };

    const { error } = await supabase.from("appointments").insert({
      user_id: user.id, // from the session — never trust a client-supplied id
      doctor_id: doctorId,
      service: v.service, // slug, not the display label
      patient_name: v.patientName,
      patient_dob: v.patientInfoType === "dob" ? v.patientDob : null,
      patient_age: v.patientInfoType === "age" ? Number(v.patientAge) : null,
      guardian_name: v.guardianName,
      contact_phone: v.phone,
      contact_email: v.email,
      scheduled_date: v.preferredDate,
      slot_time: slotTime,
      notes: v.notes?.trim() ? v.notes : null,
      // status defaults to 'pending'
    });

    return { doctorId, error };
  }

  let { doctorId, error } = await attemptInsert();
  if (doctorId && error?.code === "23505") {
    ({ doctorId, error } = await attemptInsert()); // one designed retry, see above
  }

  if (!doctorId) {
    return { error: "That service has no doctor available at that time. Please choose another slot." };
  }

  if (error) {
    // 23505 = unique_violation: the appointments_no_double_booking index fired
    // because someone claimed this slot between the page loading and this insert.
    if (error.code === "23505") {
      return {
        error: "That time was just booked by someone else. Please pick another slot.",
      };
    }
    // 23514 = check_violation, e.g. a Sunday date or an out-of-range age.
    if (error.code === "23514") {
      return { error: "We can't schedule that date or time. Please choose another." };
    }
    return { error: "We couldn't save your appointment. Please try again." };
  }

  // Best-effort only — the booking is already saved. sendEmail() never
  // throws, so a Resend outage or a missing API key can't turn a successful
  // booking into an error the family didn't cause.
  await sendBookingConfirmationEmail({
    to: v.email,
    guardianName: v.guardianName,
    patientName: v.patientName,
    service: v.service,
    date: v.preferredDate,
    time: slotTime,
  });

  revalidatePath("/portal");
  return { success: true };
}

/**
 * Book an appointment by clicking a specific doctor's free slot on the
 * family's own portal timetable.
 *
 * This is the client-side equivalent of createDoctorAppointment in
 * app/actions/admin.ts — same "the click IS the doctor selection" model,
 * reversing the earlier "patients never pick a doctor" rule specifically for
 * this flow. createAppointment (the /appointment page, reachable by
 * logged-out visitors and via resolve_doctor()'s auto-assignment) is
 * untouched and still exists side by side with this.
 *
 * Always starts 'pending' — unlike staff's version, a patient can never
 * self-approve, same as everywhere else in this app.
 */
export async function createClientDoctorAppointment(
  doctorId: string,
  serviceSlug: string,
  scheduledDate: string,
  slotTimeLabel: string,
  values: unknown
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = clientSlotBookingSchema.safeParse(values);
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

  // Trusts doctorId/serviceSlug from the click, bounded the same way as the
  // staff version: requireUser() above, plus this guard confirming the
  // clicked doctor still actually offers the clicked service and is active.
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
    user_id: user.id,
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
    // status defaults to 'pending'
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That slot was just taken. Please pick another." };
    }
    if (error.code === "23514") {
      return { error: "We can't schedule that date or time. Please choose another." };
    }
    return { error: "Could not save your appointment. Please try again." };
  }

  await sendBookingConfirmationEmail({
    to: v.email,
    guardianName: v.guardianName,
    patientName: v.patientName,
    service: serviceSlug,
    date: scheduledDate,
    time: slotTime,
  });

  revalidatePath("/portal");
  return { success: true };
}

/**
 * Cancel an appointment.
 *
 * Two independent controls apply, and both matter:
 *   - RLS restricts the UPDATE to rows where user_id = auth.uid(), so you
 *     cannot cancel someone else's booking even knowing its id.
 *   - The guard_appointment_update trigger restricts patients to the
 *     'cancelled' status specifically, so this cannot be repurposed to
 *     self-approve.
 */
export async function cancelAppointment(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id)
    // Scoped to the caller's own booking on purpose. RLS alone is not enough
    // here any more: "Staff can update all appointments" means a staff or admin
    // account calling this could cancel ANY family's booking by id. This is the
    // client-facing cancel action, so it should only ever touch your own row —
    // staff cancel through the Staff View, which is audited and deliberate.
    .eq("user_id", user.id)
    .select("service, scheduled_date, slot_time, contact_email, guardian_name")
    .single();

  if (error) {
    return { error: "We couldn't cancel that appointment. Please try again." };
  }

  await sendCancellationEmail({
    to: data.contact_email,
    guardianName: data.guardian_name,
    service: data.service,
    date: data.scheduled_date,
    time: data.slot_time,
  });

  revalidatePath("/portal");
  return { success: true };
}

/**
 * Reschedule your own appointment to a new date/time.
 *
 * Everything else about the row — patient, guardian, contact info, doctor —
 * stays untouched; only scheduled_date/slot_time change. The
 * guard_appointment_update trigger is what actually forces the status back
 * to 'pending' when a patient does this (see migration 15) — this action
 * doesn't need to, and shouldn't, duplicate that rule in app code.
 */
export async function rescheduleAppointment(
  id: string,
  values: unknown
): Promise<ActionResult> {
  const user = await requireUser();

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

  // The row before the change — needed for the "moved from X to Y" email,
  // and to confirm this is actually the caller's own booking before showing
  // anything back to them.
  const { data: before } = await supabase
    .from("appointments")
    .select("scheduled_date, slot_time, service, contact_email, guardian_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!before) {
    return { error: "We couldn't find that appointment." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ scheduled_date: v.preferredDate, slot_time: slotTime })
    .eq("id", id)
    .eq("user_id", user.id); // same ownership scoping as cancelAppointment

  if (error) {
    if (error.code === "23505") {
      return { error: "That time was just booked by someone else. Please pick another slot." };
    }
    // 23514 = check_violation — either a bad date (e.g. Sunday) or the
    // guard_appointment_update trigger rejecting a closed appointment. The
    // reschedule button is already hidden for closed appointments in the
    // UI, so this message covers the far more likely case.
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
    // A patient-initiated reschedule always lands back on pending — see
    // migration 15 — so this is always true for this action specifically.
    needsConfirmation: true,
  });

  revalidatePath("/portal");
  return { success: true };
}
