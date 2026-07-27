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
 * Hand-written bio copy for the public landing page, keyed by doctor name.
 *
 * Everything else about a provider — who's listed, their specialty, their
 * schedule, whether they're currently in the clinic — now comes live from the
 * `doctors` table via `doctor_roster()` / `doctor_presence()` (see
 * components/marketing/hero.tsx and team-section.tsx), not from a hand-synced
 * copy of it. Only `credential` and `bio` live here, because the database has
 * nowhere to put that prose.
 *
 * Keyed by name rather than the doctor's real `id` (uuid) — this project has
 * no way to query the live Supabase project from outside the dashboard, so
 * there was no way to look up real ids while writing this. If your clinic
 * ever has two providers with the same name, switch this to `id` keys (run
 * `select id, name from doctors;` in the SQL Editor to get them) — until
 * then, name is a perfectly stable key for three people.
 */
export const doctorBios: Record<string, { credential: string; bio: string }> = {
  "Dr. Chen": {
    credential: "MD, Developmental-Behavioral Pediatrics",
    bio: "Twelve years guiding families through evaluations and milestones, with a focus on unhurried, whole-child assessments over rushed checklists.",
  },
  "Ms. Alvarez": {
    credential: "M.S., CCC-SLP",
    bio: "Specializes in early language delay and feeding therapy, building communication tools that fit into a family's daily routine, not around it.",
  },
  "Mr. Boone": {
    credential: "OTR/L",
    bio: "Works through play — sensory integration and fine motor skills — toward the everyday confidence of getting dressed, writing, and eating independently.",
  },
};

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
