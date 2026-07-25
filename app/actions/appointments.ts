"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { labelToSlotTime } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";
import { appointmentSchema, checkPatientInfo } from "@/lib/validation";

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

  // "Doctor in Charge", resolved from the service the family picked. The
  // booking form has no doctor field; service_slug in the doctors table is what
  // makes the assignment automatic.
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("service_slug", v.service)
    .single();

  if (!doctor) {
    return { error: "That service isn't available right now. Please call us." };
  }

  const { error } = await supabase.from("appointments").insert({
    user_id: user.id, // from the session — never trust a client-supplied id
    doctor_id: doctor.id,
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
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    return { error: "We couldn't cancel that appointment. Please try again." };
  }

  revalidatePath("/portal");
  return { success: true };
}
