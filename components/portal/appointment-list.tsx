"use client";

import { useState, useTransition } from "react";
import { CalendarX2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cancelAppointment } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppointmentStatus = "pending" | "approved" | "completed" | "cancelled";

export interface AppointmentRow {
  id: string;
  patientName: string;
  serviceLabel: string;
  doctorName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}

const statusStyles: Record<AppointmentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-brand-blue-50 text-brand-blue-700 ring-brand-blue-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-400/20",
};

const statusCopy: Record<AppointmentStatus, string> = {
  pending: "Awaiting confirmation",
  approved: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function AppointmentList({ appointments }: { appointments: AppointmentRow[] }) {
  if (appointments.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-slate-700">
        You don&apos;t have any upcoming appointments yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {appointments.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}
    </ul>
  );
}

function AppointmentCard({ appointment }: { appointment: AppointmentRow }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  // A patient can only ever move an appointment to 'cancelled', and only from
  // an open state. Both rules are enforced in the database by the
  // guard_appointment_update trigger — this just avoids offering a button that
  // would be rejected.
  const canCancel =
    appointment.status === "pending" || appointment.status === "approved";

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelAppointment(appointment.id);
      setConfirming(false);
      if (result.error) {
        toast.error("Couldn't cancel", { description: result.error });
        return;
      }
      toast.success("Appointment cancelled", {
        description: "The slot is now free for another family.",
      });
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="font-medium text-navy-900">{appointment.serviceLabel}</p>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
              statusStyles[appointment.status]
            )}
          >
            {statusCopy[appointment.status]}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-slate-700">
          {formatLongDate(appointment.date)} at {appointment.time} &middot;{" "}
          {appointment.doctorName}
        </p>
        <p className="mt-0.5 text-sm text-slate-400">
          Patient: {appointment.patientName}
        </p>
      </div>

      {canCancel &&
        (confirming ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={isPending}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Cancelling&hellip;
                </>
              ) : (
                "Confirm cancel"
              )}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
            <CalendarX2 className="size-4" />
            Cancel
          </Button>
        ))}
    </li>
  );
}

/** "2026-07-27" -> "Monday, July 27" */
function formatLongDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
