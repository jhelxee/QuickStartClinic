import Link from "next/link";
import { CalendarPlus } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slotLabels } from "@/lib/slots";
import type { WeekColumn } from "@/lib/schedule-data";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/components/portal/appointment-list";

export interface StaffSlotEntry {
  id: string;
  date: string;
  time: string;
  patientName: string;
  serviceLabel: string;
  status: AppointmentStatus;
  /** True when no account is attached — a phone or walk-in booking. */
  phoneBooking: boolean;
}

/** One doctor's row within a specialty tab. */
export interface DoctorRow {
  doctorId: string;
  doctorName: string;
  serviceSlug: string;
  inClinic: boolean;
  /** This doctor's bookings only. */
  entries: StaffSlotEntry[];
}

/** One specialty tab, grouping every doctor who offers that service. */
export interface SpecialtyGroup {
  serviceSlug: string;
  serviceLabel: string;
  doctors: DoctorRow[];
}

/**
 * The clinic's week at a glance, WITH patient names, grouped by specialty and
 * then by doctor.
 *
 * This is the deliberate opposite of the patient-facing WeeklyTimetable, which
 * shows other families' slots as a bare "Occupied" and carries no identifying
 * data at all. Staff are authorised to see who is booked, so this renders the
 * name, service, and provider.
 *
 * Specialties are always shown as three fixed tabs (matching serviceOptions),
 * even one with zero active doctors — a missing tab would read as a bug, an
 * empty one reads as "nobody currently offers this."
 *
 * Free cells are clickable when `onCellClick` is provided — clicking a
 * specific doctor's row IS the doctor selection for a new booking, there is
 * no separate picker anywhere.
 */
export function StaffTimetable({
  today,
  week,
  specialties,
  onCellClick,
}: {
  /** YYYY-MM-DD, from the server. */
  today: string;
  week: WeekColumn[];
  specialties: SpecialtyGroup[];
  onCellClick?: (slot: {
    doctorId: string;
    doctorName: string;
    serviceSlug: string;
    date: string;
    time: string;
  }) => void;
}) {
  return (
    // One continuous frame around everything — tabs included — rather than
    // the tab strips floating loose above a separately-bordered grid.
    <Tabs
      defaultValue={specialties[0]?.serviceSlug}
      className="gap-0 overflow-hidden rounded-2xl border border-border bg-white"
    >
      <div className="border-b border-border p-4">
        <TabsList>
          {specialties.map((group) => (
            <TabsTrigger key={group.serviceSlug} value={group.serviceSlug}>
              {group.serviceLabel}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {specialties.map((group) => (
        <TabsContent key={group.serviceSlug} value={group.serviceSlug} className="p-4">
          {group.doctors.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-slate-700">
              No active doctors currently offer this service.
            </p>
          ) : group.doctors.length === 1 ? (
            // A single doctor doesn't need a sub-tab bar of one — that's
            // just an extra click for no choice. The name has nowhere else
            // to show, so it keeps its own header row here.
            <DoctorTimetable
              doctor={group.doctors[0]}
              serviceSlug={group.serviceSlug}
              today={today}
              week={week}
              onCellClick={onCellClick}
              showHeader
            />
          ) : (
            // One box, same as the single-doctor case — the doctor picker is
            // a flat header strip inside it, not a pill floating above a
            // separately-boxed table. Underlined instead of pill-shaped, to
            // read as "which doctor's data is this box showing" rather than
            // as its own independent control.
            <Tabs
              defaultValue={group.doctors[0].doctorId}
              className="gap-0 overflow-hidden rounded-2xl border border-border"
            >
              <TabsList className="w-full justify-start gap-5 rounded-none border-t-0 border-r-0 border-l-0 border-b border-border bg-white p-0 px-4">
                {group.doctors.map((doctor) => (
                  <TabsTrigger
                    key={doctor.doctorId}
                    value={doctor.doctorId}
                    className="rounded-none border-b-2 border-transparent px-1 py-3 data-[state=active]:border-brand-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        doctor.inClinic
                          ? "bg-emerald-500"
                          : "border border-slate-400 bg-transparent"
                      )}
                      aria-hidden="true"
                    />
                    {doctor.doctorName}
                  </TabsTrigger>
                ))}
              </TabsList>

              {group.doctors.map((doctor) => (
                <TabsContent key={doctor.doctorId} value={doctor.doctorId}>
                  <DoctorTimetable
                    doctor={doctor}
                    serviceSlug={group.serviceSlug}
                    today={today}
                    week={week}
                    onCellClick={onCellClick}
                    showHeader={false}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function DoctorTimetable({
  doctor,
  serviceSlug,
  today,
  week,
  onCellClick,
  showHeader,
}: {
  doctor: DoctorRow;
  serviceSlug: string;
  today: string;
  week: WeekColumn[];
  onCellClick?: (slot: {
    doctorId: string;
    doctorName: string;
    serviceSlug: string;
    date: string;
    time: string;
  }) => void;
  /** False when a sub-tab above already shows this doctor's name — showing
   *  it again here would just repeat what the active tab already says. */
  showHeader: boolean;
}) {
  const byCell = new Map<string, StaffSlotEntry[]>();
  for (const entry of doctor.entries) {
    const key = `${entry.date}|${entry.time}`;
    byCell.set(key, [...(byCell.get(key) ?? []), entry]);
  }

  return (
    // Only draws its own box when standalone (the single-doctor case). When
    // nested under doctor sub-tabs, the parent Tabs already provides one
    // continuous box — a second border here would nest a box inside a box.
    <div className={cn("overflow-x-auto", showHeader && "rounded-2xl border border-border")}>
      {showHeader && (
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <span
            className={cn(
              "size-2 rounded-full",
              doctor.inClinic ? "bg-emerald-500" : "border border-slate-400 bg-transparent"
            )}
            aria-hidden="true"
          />
          <h3 className="font-display text-base text-navy-900">{doctor.doctorName}</h3>
        </div>
      )}

      <table className="w-full min-w-[900px] border-collapse text-sm">
        <caption className="sr-only">
          {doctor.doctorName}&apos;s timetable for this week, showing patient
          names and services for every booking.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="w-24 border-b border-border p-3 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase"
            >
              Time
            </th>
            {week.map((column) => (
              <th
                key={column.date}
                scope="col"
                className="border-b border-border p-3 text-left text-xs font-semibold tracking-wide text-navy-900 uppercase"
              >
                <span className={cn(column.date === today && "text-brand-blue-700")}>
                  {column.day.slice(0, 3)}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-[0.65rem] font-normal normal-case",
                    column.date === today
                      ? "font-medium text-brand-blue-700"
                      : "text-slate-400"
                  )}
                >
                  {formatShortDate(column.date)}
                  {column.date === today && " · Today"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slotLabels.map((time) => (
            <tr key={time} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="p-3 text-left text-xs font-medium text-slate-400"
              >
                {time}
              </th>
              {week.map((column) => {
                const booked = byCell.get(`${column.date}|${time}`) ?? [];
                const isToday = column.date === today;

                // Sunday: clinic shut. Any booking that somehow exists still
                // renders below, so nothing is ever hidden from staff.
                if (column.isClosed && booked.length === 0) {
                  return (
                    <td key={column.date} className="p-1.5 align-top">
                      <div className="flex min-h-16 items-center justify-center rounded-full bg-slate-50 text-xs text-slate-300">
                        Closed
                      </div>
                    </td>
                  );
                }

                if (booked.length === 0) {
                  const clickable = !column.isClosed && Boolean(onCellClick);
                  return (
                    <td key={column.date} className="p-1.5 align-top">
                      {clickable ? (
                        <button
                          type="button"
                          onClick={() =>
                            onCellClick?.({
                              doctorId: doctor.doctorId,
                              doctorName: doctor.doctorName,
                              serviceSlug,
                              date: column.date,
                              time,
                            })
                          }
                          className="flex min-h-16 w-full items-center justify-center rounded-full border border-dashed border-border text-xs text-slate-300 transition-colors hover:border-brand-blue-600/40 hover:bg-brand-blue-50 hover:text-brand-blue-700"
                        >
                          <span className="inline-flex items-center gap-1">
                            <CalendarPlus className="size-3.5" />
                            Free
                          </span>
                        </button>
                      ) : (
                        <div className="flex min-h-16 items-center justify-center rounded-full border border-dashed border-border text-xs text-slate-300">
                          Free
                        </div>
                      )}
                    </td>
                  );
                }

                return (
                  <td key={column.date} className="p-1.5 align-top">
                    <div className="flex flex-col gap-1.5">
                      {booked.map((entry) => {
                        // Today is the day staff are working from, so it's the
                        // only column that gets colour — but only for what's
                        // still outstanding there. A completed visit is done,
                        // not something to act on, so once it's marked
                        // completed it settles into the same neutral grey as
                        // any other day rather than staying "active" blue.
                        const isLive =
                          isToday &&
                          entry.status !== "cancelled" &&
                          entry.status !== "completed";
                        return (
                          // One click straight to this patient's full record
                          // — no need to go find them in Records separately.
                          // Same page every "Records" link already points at,
                          // just pre-filled with who was clicked.
                          <Link
                            key={entry.id}
                            href={`/admin/records?q=${encodeURIComponent(entry.patientName)}`}
                            className={cn(
                              "block min-h-16 rounded-2xl px-3 py-2 text-xs transition-opacity hover:opacity-80",
                              entry.status === "cancelled"
                                ? "bg-slate-100 text-slate-400 line-through"
                                : isLive
                                  ? "bg-brand-blue-600 text-white shadow-sm"
                                  : "bg-slate-100 ring-1 ring-slate-300/60"
                            )}
                          >
                            <p
                              className={cn(
                                "font-semibold",
                                isLive ? "text-white" : "text-navy-900"
                              )}
                            >
                              {entry.patientName}
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 leading-tight",
                                isLive ? "text-white/85" : "text-slate-700"
                              )}
                            >
                              {entry.serviceLabel}
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-[0.65rem] font-medium tracking-wide uppercase",
                                isLive ? "text-white/70" : "text-slate-400"
                              )}
                            >
                              {entry.status === "pending"
                                ? "Not yet confirmed"
                                : entry.status === "completed"
                                  ? "Completed"
                                  : entry.status === "cancelled"
                                    ? "Cancelled"
                                    : "Confirmed"}
                              {entry.phoneBooking && " · Phone"}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "2026-07-27" -> "Jul 27" */
function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
