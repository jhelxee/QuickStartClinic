import { Stethoscope } from "lucide-react";

import type { DoctorPresence } from "@/lib/dal";
import { cn } from "@/lib/utils";

/**
 * "Is my child's doctor in today?" — answered at a glance.
 *
 * Deliberately plain language. "In clinic now" / "Not in right now" beats
 * "Online"/"Offline", which sounds like a chat app and tells a worried parent
 * nothing about whether anyone is at the building.
 *
 * Status is never the only signal: colour, a filled/hollow dot, and the text
 * itself all carry it, so it still reads correctly in monochrome or to someone
 * who can't distinguish the two colours.
 */
export function DoctorStatusPanel({
  doctors,
  className,
}: {
  doctors: DoctorPresence[];
  className?: string;
}) {
  if (doctors.length === 0) return null;

  return (
    <section
      className={cn("rounded-2xl border border-border bg-white p-6", className)}
      aria-labelledby="doctor-status-heading"
    >
      <h2
        id="doctor-status-heading"
        className="flex items-center gap-2.5 font-display text-lg text-navy-900"
      >
        <Stethoscope className="size-5 text-brand-blue-600" aria-hidden="true" />
        Who&apos;s in the clinic
      </h2>
      <p className="mt-1 text-sm text-slate-700">
        Updated live as your care team signs in and out.
      </p>

      <div className="mt-4 max-h-80 overflow-y-auto">
        <ul className="flex flex-col divide-y divide-border">
          {doctors.map((doctor) => (
            <li
              key={doctor.doctor_id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-navy-900">{doctor.name}</p>
                <p className="text-sm text-slate-400">{doctor.specialty}</p>
              </div>
              <DoctorStatusBadge inClinic={doctor.in_clinic} />
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Being in the clinic doesn&apos;t always mean a doctor is free to see
        someone — they may be with another family. Please still book ahead.
      </p>
    </section>
  );
}

export function DoctorStatusBadge({
  inClinic,
  size = "md",
}: {
  inClinic: boolean;
  /** "sm" for tight spaces like the homepage hero card; "md" everywhere else. */
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-medium ring-1 ring-inset",
        size === "sm" ? "gap-1 px-2 py-0.5 text-[0.65rem]" : "gap-1.5 px-2.5 py-1 text-xs",
        inClinic
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
          : "bg-slate-100 text-slate-500 ring-slate-400/20"
      )}
    >
      <span
        className={cn(
          "rounded-full",
          size === "sm" ? "size-1.5" : "size-2",
          inClinic ? "bg-emerald-500" : "border border-slate-400 bg-transparent"
        )}
        aria-hidden="true"
      />
      {inClinic ? "In clinic now" : "Not in right now"}
    </span>
  );
}
