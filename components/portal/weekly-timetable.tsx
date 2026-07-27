import { CalendarCheck2, CalendarPlus } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slotLabels } from "@/lib/slots";
import type { WeekColumn } from "@/lib/schedule-data";
import { cn } from "@/lib/utils";

/** One of the caller's own appointments, already mapped to display values. */
export interface TimetableEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** Display label, e.g. "9:00 AM" */
  time: string;
  serviceLabel: string;
  doctorId: string;
}

/**
 * A booked slot belonging to anyone. Comes from the get_booked_slots database
 * function, which returns date, time, and doctor id — and deliberately nothing
 * that could identify a patient. See supabase/migrations/06_availability.sql.
 */
export interface BookedSlot {
  date: string;
  time: string;
  doctorId: string;
}

/** One doctor's own row within a specialty tab. */
export interface PatientDoctorRow {
  doctorId: string;
  doctorName: string;
  serviceSlug: string;
  inClinic: boolean;
}

/** One specialty tab, grouping every doctor who offers that service. */
export interface PatientSpecialtyGroup {
  serviceSlug: string;
  serviceLabel: string;
  doctors: PatientDoctorRow[];
}

/**
 * Server component — it receives everything as props and renders no client JS
 * of its own (Tabs is the only piece with "use client", and it's a shared
 * primitive, not something this file needs to opt into itself).
 *
 * Same specialty-tabs-then-doctor-tabs structure as the staff timetable
 * (components/admin/staff-timetable.tsx) — one continuous bordered frame,
 * not a separate pill floating above a separately-boxed grid. The privacy
 * boundary is unchanged: a cell only ever says "Yours", "Occupied", or
 * "Available" — never another family's name, even broken out per doctor.
 */
export function WeeklyTimetable({
  today,
  week,
  specialties,
  mine,
  booked,
  onCellClick,
}: {
  /** YYYY-MM-DD. Comes from the server so both sides agree on "today". */
  today: string;
  week: WeekColumn[];
  specialties: PatientSpecialtyGroup[];
  mine: TimetableEntry[];
  booked: BookedSlot[];
  onCellClick?: (slot: {
    doctorId: string;
    doctorName: string;
    serviceSlug: string;
    date: string;
    time: string;
  }) => void;
}) {
  return (
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
            // A single doctor doesn't need a sub-tab bar of one.
            <DoctorGrid
              doctor={group.doctors[0]}
              serviceSlug={group.serviceSlug}
              today={today}
              week={week}
              mine={mine}
              booked={booked}
              onCellClick={onCellClick}
              showHeader
            />
          ) : (
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
                        doctor.inClinic ? "bg-emerald-500" : "border border-slate-400 bg-transparent"
                      )}
                      aria-hidden="true"
                    />
                    {doctor.doctorName}
                  </TabsTrigger>
                ))}
              </TabsList>

              {group.doctors.map((doctor) => (
                <TabsContent key={doctor.doctorId} value={doctor.doctorId}>
                  <DoctorGrid
                    doctor={doctor}
                    serviceSlug={group.serviceSlug}
                    today={today}
                    week={week}
                    mine={mine}
                    booked={booked}
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

function DoctorGrid({
  doctor,
  serviceSlug,
  today,
  week,
  mine,
  booked,
  onCellClick,
  showHeader,
}: {
  doctor: PatientDoctorRow;
  serviceSlug: string;
  today: string;
  week: WeekColumn[];
  mine: TimetableEntry[];
  booked: BookedSlot[];
  onCellClick?: (slot: {
    doctorId: string;
    doctorName: string;
    serviceSlug: string;
    date: string;
    time: string;
  }) => void;
  /** False when a sub-tab above already shows this doctor's name. */
  showHeader: boolean;
}) {
  const mineByCell = new Map(
    mine.filter((a) => a.doctorId === doctor.doctorId).map((a) => [`${a.date}|${a.time}`, a])
  );
  const bookedCells = new Set(
    booked.filter((b) => b.doctorId === doctor.doctorId).map((b) => `${b.date}|${b.time}`)
  );

  function cellFor(date: string, time: string) {
    const key = `${date}|${time}`;
    const appointment = mineByCell.get(key);
    if (appointment) return { status: "yours" as const, appointment };
    if (bookedCells.has(key)) return { status: "occupied" as const, appointment: null };
    return { status: "available" as const, appointment: null };
  }

  return (
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

      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">
          {doctor.doctorName}&apos;s timetable for this week — your own appointments are
          labeled with their service; every other booked slot is shown only as
          Occupied, with no patient details, to protect other families&apos;
          privacy.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="w-28 border-b border-border p-3 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase"
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
              <th scope="row" className="p-3 text-left text-xs font-medium text-slate-400">
                {time}
              </th>
              {week.map((column) => {
                const { status, appointment } = cellFor(column.date, time);
                const isToday = column.date === today;

                // The rolling window can include a Sunday, when the clinic is
                // shut. Showing those slots as "Available" would invite bookings
                // the no_sunday database constraint would reject anyway.
                if (column.isClosed) {
                  return (
                    <td key={column.date} className="p-1.5 align-top">
                      <div
                        role="img"
                        aria-label={`${column.day} ${time}: clinic closed`}
                        className="flex min-h-14 items-center justify-center rounded-full bg-slate-50 text-xs text-slate-300"
                      >
                        Closed
                      </div>
                    </td>
                  );
                }

                if (status === "available") {
                  const clickable = Boolean(onCellClick);
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
                          aria-label={`${column.day} ${time}: available, click to book`}
                          className="flex min-h-14 w-full items-center justify-center gap-1 rounded-full border border-dashed border-border text-xs text-slate-300 transition-colors hover:border-brand-blue-600/40 hover:bg-brand-blue-50 hover:text-brand-blue-700"
                        >
                          <CalendarPlus className="size-3.5" />
                          Available
                        </button>
                      ) : (
                        <div
                          role="img"
                          aria-label={`${column.day} ${time}: available`}
                          className="flex min-h-14 items-center justify-center rounded-full border border-dashed border-border text-xs text-slate-300"
                        >
                          Available
                        </div>
                      )}
                    </td>
                  );
                }

                return (
                  <td key={column.date} className="p-1.5 align-top">
                    <div
                      role="img"
                      aria-label={
                        status === "yours" && appointment
                          ? `${column.day} ${time}: your ${appointment.serviceLabel} appointment${isToday ? ", today" : ""}`
                          : `${column.day} ${time}: occupied`
                      }
                      className={cn(
                        "flex min-h-14 flex-col justify-center rounded-full px-3 py-2 text-xs",
                        // Today's own appointments are the thing a family is
                        // most likely to be looking for, so they get the only
                        // saturated colour on the grid. Every other day of
                        // theirs is grey — still clearly "yours", but visually
                        // out of the way.
                        status === "yours" &&
                          (isToday
                            ? "bg-brand-blue-600 text-white shadow-sm"
                            : "bg-slate-200 text-slate-700"),
                        // "Occupied" is a single centered word, same as
                        // Available/Free — "Yours" keeps its own left-aligned
                        // icon+label plus a service-name line underneath, so
                        // only this branch gets the extra centering.
                        status === "occupied" &&
                          "items-center justify-center bg-ice-50 text-center text-slate-400"
                      )}
                    >
                      {status === "yours" && appointment ? (
                        <>
                          <span className="flex items-center gap-1 font-semibold">
                            <CalendarCheck2 className="size-3 shrink-0" />
                            {isToday ? "Today" : "Yours"}
                          </span>
                          <span className="mt-0.5 leading-tight">
                            {appointment.serviceLabel}
                          </span>
                        </>
                      ) : (
                        "Occupied"
                      )}
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
