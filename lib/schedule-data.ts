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
  credential: string;
  specialty: string;
  bio: string;
  days: WeekDay[];
}[] = [
  {
    name: "Dr. Chen",
    credential: "MD, Developmental-Behavioral Pediatrics",
    specialty: "Developmental Pediatrician",
    bio: "Twelve years guiding families through evaluations and milestones, with a focus on unhurried, whole-child assessments over rushed checklists.",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  },
  {
    name: "Ms. Alvarez",
    credential: "M.S., CCC-SLP",
    specialty: "Speech Therapy",
    bio: "Specializes in early language delay and feeding therapy, building communication tools that fit into a family's daily routine, not around it.",
    days: ["Monday", "Wednesday", "Friday"],
  },
  {
    name: "Mr. Boone",
    credential: "OTR/L",
    specialty: "Occupational Therapy",
    bio: "Works through play — sensory integration and fine motor skills — toward the everyday confidence of getting dressed, writing, and eating independently.",
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
  /** Full day name. May be "Sunday", which WeekDay excludes. */
  day: string;
  /** YYYY-MM-DD — the actual calendar date this column represents. */
  date: string;
  /** Sunday — the clinic is shut, so the column renders as unbookable. */
  isClosed: boolean;
}

const ALL_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

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
/**
 * A rolling window of days starting today.
 *
 * Replaces the old fixed Monday–Saturday grid, which had a real problem: on a
 * Saturday it showed Mon–Sat of a week that was already over, so an appointment
 * two days out simply had no column to appear in. Anchoring the first column to
 * today means the next week of the schedule is always on screen, and days that
 * have passed drop off by themselves.
 *
 * Dates are built from year/month/day parts rather than by adding milliseconds,
 * so the sequence stays correct across month ends and daylight-saving changes.
 *
 * Called on the server and passed down as props, so both sides agree on which
 * day is "today".
 */
export function rollingColumns(
  from: Date = new Date(),
  count = 7
): WeekColumn[] {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate() + offset
    );
    const dayOfWeek = date.getDay(); // 0 = Sunday
    return {
      day: ALL_DAY_NAMES[dayOfWeek],
      date: toISODate(date),
      isClosed: dayOfWeek === 0,
    };
  });
}
