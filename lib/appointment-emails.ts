import "server-only";

import { emailShell, sendEmail } from "@/lib/email";
import { slotTimeToLabel } from "@/lib/slots";
import { serviceLabel } from "@/lib/validation";

/**
 * Shared cancellation/reschedule email content — called from both
 * app/actions/appointments.ts (a family acting on their own booking) and
 * app/actions/admin.ts (staff acting on any booking). One owner for this
 * copy, same reasoning as lib/slots.ts, rather than writing it out twice.
 *
 * Both are best-effort, same as the booking-confirmation email: sendEmail()
 * never throws, so a Resend outage can't turn a successful cancel/reschedule
 * into an error the family didn't cause.
 */

/** "2026-07-25" -> "Saturday, July 25, 2026" */
function formatLongDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "09:00:00" or "09:00" -> "9:00 AM". Falls back to the raw value on a
 *  mismatch rather than showing nothing. */
function timeLabel(value: string) {
  return slotTimeToLabel(value) ?? value;
}

export async function sendBookingConfirmationEmail(params: {
  to: string;
  guardianName: string;
  patientName: string;
  service: string;
  date: string;
  time: string;
}) {
  await sendEmail({
    to: params.to,
    subject: "We received your appointment request — QuickStart Clinic",
    html: emailShell(
      "Appointment request received",
      `<p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hi ${params.guardianName.split(" ")[0]},</p>
       <p style="margin:0 0 12px;color:#334155;line-height:1.6;">We've received your request for <strong>${serviceLabel(params.service)}</strong> for ${params.patientName}. Here's what you booked:</p>
       <table role="presentation" width="100%" style="margin:16px 0;background:#f4f9fb;border-radius:12px;">
         <tr><td style="padding:16px;color:#0b2a4a;">
           <p style="margin:0 0 4px;"><strong>Date:</strong> ${formatLongDate(params.date)}</p>
           <p style="margin:0 0 4px;"><strong>Time:</strong> ${timeLabel(params.time)}</p>
           <p style="margin:0;"><strong>Status:</strong> Pending confirmation</p>
         </td></tr>
       </table>
       <p style="margin:0;color:#334155;line-height:1.6;">Our care coordination team will confirm this within one business day. You can check its status anytime from your family portal.</p>`
    ),
  });
}

export async function sendCancellationEmail(params: {
  to: string;
  guardianName: string;
  service: string;
  date: string;
  time: string;
}) {
  await sendEmail({
    to: params.to,
    subject: "Your appointment has been cancelled — QuickStart Clinic",
    html: emailShell(
      "Appointment cancelled",
      `<p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hi ${params.guardianName.split(" ")[0]},</p>
       <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Your <strong>${serviceLabel(params.service)}</strong> appointment on ${formatLongDate(params.date)} at ${timeLabel(params.time)} has been cancelled.</p>
       <p style="margin:0;color:#334155;line-height:1.6;">Whenever you're ready, you can book a new time from your family portal.</p>`
    ),
  });
}

export async function sendRescheduleEmail(params: {
  to: string;
  guardianName: string;
  service: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  /** Whether the moved appointment still needs the clinic to confirm it. */
  needsConfirmation: boolean;
}) {
  await sendEmail({
    to: params.to,
    subject: "Your appointment has been rescheduled — QuickStart Clinic",
    html: emailShell(
      "Appointment rescheduled",
      `<p style="margin:0 0 12px;color:#334155;line-height:1.6;">Hi ${params.guardianName.split(" ")[0]},</p>
       <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Your <strong>${serviceLabel(params.service)}</strong> appointment has moved.</p>
       <table role="presentation" width="100%" style="margin:16px 0;background:#f4f9fb;border-radius:12px;">
         <tr><td style="padding:16px;color:#0b2a4a;">
           <p style="margin:0 0 4px;text-decoration:line-through;color:#94a3b8;">${formatLongDate(params.oldDate)} at ${timeLabel(params.oldTime)}</p>
           <p style="margin:0;"><strong>New time:</strong> ${formatLongDate(params.newDate)} at ${timeLabel(params.newTime)}</p>
         </td></tr>
       </table>
       <p style="margin:0;color:#334155;line-height:1.6;">${
         params.needsConfirmation
           ? "Our care coordination team will confirm this new time within one business day."
           : "This new time is already confirmed — no further action needed."
       }</p>`
    ),
  });
}
