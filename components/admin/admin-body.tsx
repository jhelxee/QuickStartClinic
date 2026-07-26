import Link from "next/link";
import { CalendarDays, Database, Inbox, Mail, Users } from "lucide-react";

import { AppointmentActions } from "@/components/admin/appointment-actions";
import { StaffBookingForm } from "@/components/admin/staff-booking-form";
import {
  StaffTimetable,
  type StaffSlotEntry,
} from "@/components/admin/staff-timetable";
import { DoctorStatusPanel } from "@/components/presence/doctor-status";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/components/portal/appointment-list";
import type { WeekColumn } from "@/lib/schedule-data";
import type { DoctorPresence, Role } from "@/lib/dal";
import { cn } from "@/lib/utils";

export interface StaffAppointmentRow {
  id: string;
  patientName: string;
  patientDetail: string;
  guardianName: string;
  contactPhone: string;
  contactEmail: string;
  serviceLabel: string;
  doctorName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes: string | null;
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

/** Server component — all data arrives as props from app/admin/page.tsx. */
export function AdminBody({
  staffName,
  role,
  todayDate,
  doctors,
  week,
  slots,
  today,
  pending,
  upcoming,
  past,
  newInquiriesCount,
}: {
  staffName: string;
  role: Role;
  /** YYYY-MM-DD, from the server. */
  todayDate: string;
  doctors: DoctorPresence[];
  week: WeekColumn[];
  slots: StaffSlotEntry[];
  today: StaffAppointmentRow[];
  pending: StaffAppointmentRow[];
  upcoming: StaffAppointmentRow[];
  past: StaffAppointmentRow[];
  newInquiriesCount: number;
}) {
  const isAdmin = role === "admin";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
            {isAdmin ? "Administrator" : "Staff view"}
          </span>
          <h1 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
            Clinic schedule
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-700">
            Signed in as {staffName}. You can see every family&apos;s bookings
            here — treat what&apos;s on this page as confidential.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Opt-in only. The Staff UI stays the default — this never changes
              what loads at login. It exists because staff and doctors are often
              parents here too, and without it they had no way to see their own
              children's appointments. The ?family=1 flag is what tells /portal
              to render instead of redirecting back. */}
          <Button variant="outline" size="lg" asChild>
            <Link href="/admin/inquiries">
              <Mail className="size-4" />
              Messages
              {newInquiriesCount > 0 && (
                <span className="rounded-full bg-navy-900 px-2 py-0.5 text-xs font-medium text-white">
                  {newInquiriesCount}
                </span>
              )}
            </Link>
          </Button>

          <Button variant="outline" size="lg" asChild>
            <Link href="/portal?family=1">
              <CalendarDays className="size-4" />
              My family
            </Link>
          </Button>

          {/* The ONLY difference between the Admin and Staff interfaces.
              Everything else on this page is identical for both.

              Hiding it is tidiness, not access control — requireAdmin() on
              /admin/master-data is what actually stops a staff member opening
              it, backed by the "Admins can ..." RLS policies. */}
          {isAdmin && (
            <Button size="lg" asChild>
              <Link href="/admin/master-data">
                <Database className="size-4" />
                Master data
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* First on the page, deliberately. These are families waiting on an
          answer, and they're the only thing here that needs someone to act
          rather than just look. Everything below is reference. */}
      <Section
        title="Needs your confirmation"
        count={pending.length}
        emptyCopy="Nothing waiting — every request has been handled."
        rows={pending}
        highlight
      />

      {/* Roster and presence side by side — both answer "what's happening right
          now", which is what staff need on landing here, before the week-out
          schedule below. Also shown on the client portal and the booking page;
          this is the copy staff act on (e.g. deciding whether to page a doctor
          for a walk-in), not the only place it appears. */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <TodayRoster rows={today} />
        <DoctorStatusPanel doctors={doctors} />
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-navy-900">Next 7 days</h2>
            <p className="mt-1 text-sm text-slate-700">
              Names are shown here because you&apos;re staff. The family-facing
              timetable shows other people&apos;s slots as &ldquo;Occupied&rdquo;
              with no details at all.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <StaffTimetable today={todayDate} week={week} entries={slots} />
        </div>

        <div className="mt-5">
          <StaffBookingForm />
        </div>
      </section>

      <Section
        title="Confirmed and upcoming"
        count={upcoming.length}
        emptyCopy="No confirmed appointments coming up."
        rows={upcoming}
      />

      <Section
        title="Past and closed"
        count={past.length}
        emptyCopy="Nothing here yet."
        rows={past}
      />
    </div>
  );
}

/**
 * Today's roll call — who is booked, in time order, with names.
 *
 * This is the "verify who is booked for the day" view: the fastest possible
 * answer to "who's coming in today", without scanning the week grid.
 */
function TodayRoster({ rows }: { rows: StaffAppointmentRow[] }) {
  return (
    <section className="rounded-2xl border border-brand-blue-600/20 bg-brand-blue-50/50 p-6">
      <h2 className="flex items-center gap-2.5 font-display text-xl text-navy-900">
        <Users className="size-5 text-brand-blue-700" aria-hidden="true" />
        Booked in today
        {rows.length > 0 && (
          <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-xs font-medium text-white">
            {rows.length}
          </span>
        )}
      </h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-700">
          Nobody is booked in today.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-brand-blue-600/10">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
              <span className="w-20 shrink-0 font-medium tabular-nums text-navy-900">
                {row.time}
              </span>
              <span className="font-medium text-navy-900">{row.patientName}</span>
              <span className="text-sm text-slate-700">
                {row.serviceLabel} &middot; {row.doctorName}
              </span>
              {row.status === "pending" && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Not yet confirmed
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Section({
  title,
  count,
  emptyCopy,
  rows,
  highlight = false,
}: {
  title: string;
  count: number;
  emptyCopy: string;
  rows: StaffAppointmentRow[];
  /** Draws attention while there's something outstanding. Used for the
   *  confirmation queue, which is the only section that needs acting on. */
  highlight?: boolean;
}) {
  const isWaiting = highlight && count > 0;

  return (
    <section
      className={cn(
        "mt-12",
        // Only decorated while the queue is non-empty. A permanently
        // highlighted panel stops being a signal — an empty queue should look
        // as calm as everything else.
        isWaiting &&
          "-mx-4 rounded-2xl border border-amber-600/25 bg-amber-50/40 px-4 py-6 sm:-mx-6 sm:px-6"
      )}
    >
      <h2 className="flex items-center gap-2.5 font-display text-xl text-navy-900">
        {title}
        {count > 0 && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium text-white",
              isWaiting ? "bg-amber-600" : "bg-navy-900"
            )}
          >
            {count}
          </span>
        )}
      </h2>

      {isWaiting && (
        <p className="mt-1 text-sm text-amber-800">
          {count === 1
            ? "One family is waiting to hear back."
            : `${count} families are waiting to hear back.`}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 flex items-center gap-2.5 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-slate-700">
          <Inbox className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
          {emptyCopy}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-5 rounded-2xl border border-border bg-white p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="font-medium text-navy-900">{row.serviceLabel}</p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                      statusStyles[row.status]
                    )}
                  >
                    {statusCopy[row.status]}
                  </span>
                </div>

                <p className="mt-1.5 text-sm text-slate-700">
                  {formatLongDate(row.date)} at {row.time} &middot; {row.doctorName}
                </p>

                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <Detail label="Patient" value={`${row.patientName} (${row.patientDetail})`} />
                  <Detail label="Guardian" value={row.guardianName} />
                  <Detail label="Phone" value={row.contactPhone} />
                  <Detail label="Email" value={row.contactEmail} />
                </dl>

                {row.notes && (
                  <p className="mt-3 rounded-lg bg-ice-50 p-3 text-sm leading-relaxed text-slate-700">
                    <span className="font-medium text-navy-900">Notes: </span>
                    {row.notes}
                  </p>
                )}
              </div>

              <AppointmentActions id={row.id} status={row.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 text-slate-400">{label}:</dt>
      <dd className="min-w-0 break-words text-slate-700">{value}</dd>
    </div>
  );
}

/** "2026-07-25" -> "Saturday, July 25" */
function formatLongDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
