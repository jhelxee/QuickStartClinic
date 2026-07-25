import { Clock, MessageSquareText, ShieldCheck } from "lucide-react";

import {
  AppointmentForm,
  type AppointmentDefaults,
} from "@/components/forms/appointment-form";
import { AppointmentGate } from "@/components/forms/appointment-gate";
import { DoctorStatusPanel } from "@/components/presence/doctor-status";
import { Card, CardContent } from "@/components/ui/card";
import type { DoctorPresence } from "@/lib/dal";

const sidebarPoints = [
  {
    icon: Clock,
    title: "We'll confirm within 1 business day",
    description: "A care coordinator reviews every request personally — no automated booking.",
  },
  {
    icon: MessageSquareText,
    title: "Tell us as much as you'd like",
    description: "Notes go directly to the specialist you're requesting, before you ever meet.",
  },
  {
    icon: ShieldCheck,
    title: "No referral required",
    description: "You can request an initial consultation without a physician referral.",
  },
];

/**
 * Server component. `defaults` is null for logged-out visitors, in which case
 * they get the account gate instead of the form.
 *
 * The check is done on the server, so the booking form is never sent to a
 * browser that isn't signed in — and there's no flash of the wrong state while
 * the client works out who you are.
 */
export function AppointmentPageBody({
  defaults,
  doctors,
}: {
  defaults: AppointmentDefaults | null;
  doctors: DoctorPresence[];
}) {
  if (!defaults) {
    return (
      <div className="mx-auto max-w-lg">
        <AppointmentGate />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <Card className="border-border/80">
        <CardContent>
          <AppointmentForm defaults={defaults} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6 lg:sticky lg:top-28">
        <DoctorStatusPanel doctors={doctors} />

        {sidebarPoints.map((point) => (
          <div key={point.title} className="flex gap-3.5 rounded-2xl border border-border bg-white p-5">
            <point.icon className="mt-0.5 size-5 shrink-0 text-brand-blue-600" />
            <div>
              <p className="text-sm font-semibold text-navy-900">{point.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {point.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
