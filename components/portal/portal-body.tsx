import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";

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
import { DoctorStatusPanel } from "@/components/presence/doctor-status";
import type { DoctorPresence } from "@/lib/dal";
import type { WeekColumn } from "@/lib/schedule-data";

// No legend. Every cell already labels itself — "Available", "Occupied",
// "Today", or "Yours" is printed inside the cell — so a key underneath was
// repeating information the grid already carries.

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
  today,
  firstName,
  showBackToStaff = false,
  doctors,
  week,
  timetableEntries,
  bookedSlots,
  upcoming,
}: {
  /** YYYY-MM-DD, resolved on the server so client and server agree. */
  today: string;
  firstName: string;
  /** True when a clinic-side user opened this via "My family" — gives them a
   *  way back. Always false for clients, who have no other view. */
  showBackToStaff?: boolean;
  doctors: DoctorPresence[];
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
            Here&apos;s the clinic&apos;s schedule for the next seven days. Your
            own appointments are labeled — every other booked slot is shown only
            as occupied to protect other families&apos; privacy.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Only for clinic-side users who arrived via "My family". Without it
              they'd be stranded on the client view with no route back. */}
          {showBackToStaff && (
            <Button variant="outline" size="lg" asChild>
              <Link href="/admin">
                <ArrowLeft className="size-4" />
                Back to Staff view
              </Link>
            </Button>
          )}
          <Button size="lg" asChild>
            <Link href="/appointment">
              <CalendarPlus className="size-4" />
              Schedule Appointment
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <section>
          <h2 className="font-display text-xl text-navy-900">Your appointments</h2>
          <div className="mt-4">
            <AppointmentList appointments={upcoming} />
          </div>
        </section>

        <DoctorStatusPanel doctors={doctors} />
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl text-navy-900">Next 7 days</h2>

        <div className="mt-4">
          <WeeklyTimetable
            today={today}
            week={week}
            mine={timetableEntries}
            booked={bookedSlots}
          />
        </div>
      </section>
    </div>
  );
}
