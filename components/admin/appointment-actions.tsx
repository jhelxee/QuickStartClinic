"use client";

import { useTransition } from "react";
import { Check, CheckCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { rescheduleAppointmentAsStaff, setAppointmentStatus, type StaffStatus } from "@/app/actions/admin";
import { RescheduleDialog } from "@/components/reschedule-dialog";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/components/portal/appointment-list";

/**
 * Approve / decline / complete buttons.
 *
 * Which buttons appear follows the same transition rules the database enforces
 * in guard_appointment_update — this only avoids offering an action that would
 * be rejected. It is not what makes the rules true.
 */
export function AppointmentActions({
  id,
  status,
}: {
  id: string;
  status: AppointmentStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function run(next: StaffStatus, message: string) {
    startTransition(async () => {
      const result = await setAppointmentStatus(id, next);
      if (result.error) {
        toast.error("Couldn't update", { description: result.error });
        return;
      }
      toast.success(message);
    });
  }

  // Closed appointments are final — the trigger rejects any further change.
  if (status === "completed" || status === "cancelled") {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isPending && (
        <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden="true" />
      )}

      {status === "pending" && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => run("approved", "Appointment confirmed")}
        >
          <Check className="size-4" />
          Approve
        </Button>
      )}

      {status === "approved" && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => run("completed", "Marked as completed")}
        >
          <CheckCheck className="size-4" />
          Mark completed
        </Button>
      )}

      <RescheduleDialog id={id} action={rescheduleAppointmentAsStaff} />

      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => run("cancelled", "Appointment declined")}
      >
        <X className="size-4" />
        {status === "pending" ? "Decline" : "Cancel"}
      </Button>
    </div>
  );
}
