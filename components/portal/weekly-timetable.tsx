import { CalendarCheck2 } from "lucide-react";

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
}

/**
 * A booked slot belonging to anyone. Comes from the get_booked_slots database
 * function, which returns date, time, and doctor id — and deliberately nothing
 * that could identify a patient. See supabase/migrations/06_availability.sql.
 */
export interface BookedSlot {
  date: string;
  time: string;
}

/**
 * Server component — it receives everything as props and renders no client JS.
 *
 * Columns are real dates, not bare weekday names. The previous version matched
 * on weekday + time alone, so an appointment on any Monday 9:00 AM lit up this
 * week's Monday 9:00 AM cell indefinitely.
 */
export function WeeklyTimetable({
  week,
  mine,
  booked,
}: {
  week: WeekColumn[];
  mine: TimetableEntry[];
  booked: BookedSlot[];
}) {
  const mineByCell = new Map(mine.map((a) => [`${a.date}|${a.time}`, a]));
  const bookedCells = new Set(booked.map((b) => `${b.date}|${b.time}`));

  function cellFor(date: string, time: string) {
    const key = `${date}|${time}`;
    const appointment = mineByCell.get(key);
    if (appointment) return { status: "yours" as const, appointment };
    if (bookedCells.has(key)) return { status: "occupied" as const, appointment: null };
    return { status: "available" as const, appointment: null };
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">
          This week&apos;s appointment timetable — your own appointments are
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
                {column.day.slice(0, 3)}
                <span className="mt-0.5 block text-[0.65rem] font-normal normal-case text-slate-400">
                  {formatShortDate(column.date)}
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
                const { status, appointment } = cellFor(column.date, time);
                return (
                  <td key={column.date} className="p-1.5 align-top">
                    <div
                      role="img"
                      aria-label={
                        status === "yours" && appointment
                          ? `${column.day} ${time}: your ${appointment.serviceLabel} appointment`
                          : status === "occupied"
                            ? `${column.day} ${time}: occupied`
                            : `${column.day} ${time}: available`
                      }
                      className={cn(
                        "flex min-h-14 flex-col justify-center rounded-lg px-2.5 py-1.5 text-xs",
                        status === "yours" && "bg-brand-blue-600 text-white shadow-sm",
                        status === "occupied" && "bg-ice-50 text-slate-400",
                        status === "available" &&
                          "border border-dashed border-border text-slate-300"
                      )}
                    >
                      {status === "yours" && appointment ? (
                        <>
                          <span className="flex items-center gap-1 font-semibold">
                            <CalendarCheck2 className="size-3 shrink-0" />
                            Yours
                          </span>
                          <span className="mt-0.5 leading-tight">
                            {appointment.serviceLabel}
                          </span>
                        </>
                      ) : status === "occupied" ? (
                        "Occupied"
                      ) : (
                        "Available"
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
