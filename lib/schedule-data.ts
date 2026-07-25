export const weekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type WeekDay = (typeof weekDays)[number];

export const officeHours: { day: string; hours: string }[] = [
  { day: "Monday – Friday", hours: "8:00 AM – 6:00 PM" },
  { day: "Saturday", hours: "9:00 AM – 2:00 PM" },
  { day: "Sunday", hours: "Closed" },
];

/**
 * Provider list shown on the public landing page.
 *
 * Display copy only — nothing books against it. The `doctors` TABLE is the
 * source of truth for scheduling, and it's what "Doctor in Charge" is resolved
 * from at booking time (see app/actions/appointments.ts).
 *
 * Kept as a local constant so the marketing page renders without a database
 * round trip or Supabase credentials. If you add or rename a provider, update
 * both this list and the doctors table.
 */
export const doctorSchedule: {
  name: string;
  specialty: string;
  days: WeekDay[];
}[] = [
  {
    name: "Dr. Chen",
    specialty: "Developmental Pediatrician",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  },
  {
    name: "Ms. Alvarez",
    specialty: "Speech Therapy",
    days: ["Monday", "Wednesday", "Friday"],
  },
  {
    name: "Mr. Boone",
    specialty: "Occupational Therapy",
    days: ["Tuesday", "Thursday", "Saturday"],
  },
];

export function dateToWeekDay(dateStr: string): WeekDay | null {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const label = date.toLocaleDateString("en-US", { weekday: "long" });
  return (weekDays as readonly string[]).includes(label)
    ? (label as WeekDay)
    : null;
}

export interface WeekColumn {
  day: WeekDay;
  /** YYYY-MM-DD — the actual calendar date this column represents. */
  date: string;
}

/** Local-time YYYY-MM-DD. Avoids toISOString(), which shifts to UTC and can
 *  hand back yesterday's date for anyone west of Greenwich. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The six clinic days (Mon–Sat) of the current week, as real dates.
 *
 * The timetable used to match appointments on weekday + time alone, so a
 * booking on any past or future Monday 9:00 AM would light up this week's
 * Monday 9:00 AM cell — forever. Anchoring each column to a concrete date fixes
 * that.
 *
 * Called on the server and passed down as props, so server and client always
 * agree on what "this week" means.
 */
export function currentWeekColumns(today: Date = new Date()): WeekColumn[] {
  const dayOfWeek = today.getDay(); // 0 = Sunday … 6 = Saturday
  const monday = new Date(today);
  // The clinic is closed Sunday, so on a Sunday show the week that starts
  // tomorrow rather than the one that just ended.
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? -1 : dayOfWeek - 1));

  return weekDays.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { day, date: toISODate(date) };
  });
}
