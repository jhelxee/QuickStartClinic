import Link from "next/link";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AppointmentList,
  type AppointmentRow,
} from "@/components/portal/appointment-list";
import {
  WeeklyTimetable,
  type BookedSlot,
  type TimetableEntry,
} from "@/components/portal/weekly-timetable";
import type { WeekColumn } from "@/lib/schedule-data";

const legend = [
  { label: "Available", swatch: "border border-dashed border-border" },
  { label: "Occupied", swatch: "bg-ice-50" },
  { label: "Yours", swatch: "bg-brand-blue-600" },
];

/**
 * Server component. Everything arrives as props from app/portal/page.tsx, which
 * has already verified the session with requireUser().
 *
 * The old version guarded itself in a useEffect and showed a spinner until the
 * client worked out who you were. That was cosmetic — the data was in
 * localStorage the whole time, readable by anyone. Now the guard runs before
 * this ever renders, and the data comes from a database that refuses to hand
 * over other families' rows.
 */
export function PortalBody({
  firstName,
  week,
  timetableEntries,
  bookedSlots,
  upcoming,
}: {
  firstName: string;
  week: WeekColumn[];
  timetableEntries: TimetableEntry[];
  bookedSlots: BookedSlot[];
  upcoming: AppointmentRow[];
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
            Family portal
          </span>
          <h1 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-700">
            Here&apos;s the clinic&apos;s schedule for this week. Your own
            appointments are labeled — every other booked slot is shown only as
            occupied to protect other families&apos; privacy.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/appointment">
            <CalendarPlus className="size-4" />
            Schedule Appointment
          </Link>
        </Button>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl text-navy-900">Your appointments</h2>
        <div className="mt-4">
          <AppointmentList appointments={upcoming} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl text-navy-900">This week</h2>

        <div className="mt-4 flex flex-wrap gap-5">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
              <span className={`size-3 rounded-sm ${item.swatch}`} aria-hidden="true" />
              {item.label}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <WeeklyTimetable
            week={week}
            mine={timetableEntries}
            booked={bookedSlots}
          />
        </div>
      </section>
    </div>
  );
}
