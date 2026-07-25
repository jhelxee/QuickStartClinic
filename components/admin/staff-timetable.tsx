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
  doctorName: string;
  status: AppointmentStatus;
  /** True when no account is attached — a phone or walk-in booking. */
  phoneBooking: boolean;
}

/**
 * The clinic's week at a glance, WITH patient names.
 *
 * This is the deliberate opposite of the patient-facing WeeklyTimetable, which
 * shows other families' slots as a bare "Occupied" and carries no identifying
 * data at all. Staff are authorised to see who is booked, so this renders the
 * name, service, and provider.
 *
 * Nothing here bypasses the database. The "Staff can view all appointments"
 * policy from script 08 is what makes these rows available in the first place —
 * run the same page as a patient and the query returns only their own bookings,
 * so there would be nothing to render.
 */
export function StaffTimetable({
  today,
  week,
  entries,
}: {
  /** YYYY-MM-DD, from the server. */
  today: string;
  week: WeekColumn[];
  entries: StaffSlotEntry[];
}) {
  const byCell = new Map<string, StaffSlotEntry[]>();
  for (const entry of entries) {
    const key = `${entry.date}|${entry.time}`;
    byCell.set(key, [...(byCell.get(key) ?? []), entry]);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <caption className="sr-only">
          Staff timetable for this week, showing patient names, services, and
          assigned providers for every booking.
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

                return (
                  <td key={column.date} className="p-1.5 align-top">
                    {booked.length === 0 ? (
                      <div className="flex min-h-16 items-center justify-center rounded-full border border-dashed border-border text-xs text-slate-300">
                        Free
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {booked.map((entry) => (
                          // Today is the day staff are working from, so it's the
                          // only column that gets colour. Other days stay grey so
                          // the eye lands on what's happening now — status is
                          // still carried by the label underneath.
                          <div
                            key={entry.id}
                            className={cn(
                              "min-h-16 rounded-2xl px-3 py-2 text-xs",
                              entry.status === "cancelled"
                                ? "bg-slate-100 text-slate-400 line-through"
                                : isToday
                                  ? "bg-brand-blue-600 text-white shadow-sm"
                                  : "bg-slate-100 ring-1 ring-slate-300/60"
                            )}
                          >
                            <p
                              className={cn(
                                "font-semibold",
                                isToday && entry.status !== "cancelled"
                                  ? "text-white"
                                  : "text-navy-900"
                              )}
                            >
                              {entry.patientName}
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 leading-tight",
                                isToday && entry.status !== "cancelled"
                                  ? "text-white/85"
                                  : "text-slate-700"
                              )}
                            >
                              {entry.serviceLabel}
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 leading-tight",
                                isToday && entry.status !== "cancelled"
                                  ? "text-white/70"
                                  : "text-slate-400"
                              )}
                            >
                              {entry.doctorName}
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-[0.65rem] font-medium tracking-wide uppercase",
                                isToday && entry.status !== "cancelled"
                                  ? "text-white/70"
                                  : "text-slate-400"
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
                          </div>
                        ))}
                      </div>
                    )}
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
