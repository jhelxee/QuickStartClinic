/**
 * The single place appointment times are converted between the label the UI
 * shows ("9:00 AM") and the value the database stores ("09:00").
 *
 * Why this file exists: the codebase already has one label-vs-value drift bug —
 * `service` is a slug in the form but was stored as a display label in
 * localStorage, converted inline at the call site. Two representations with no
 * single owner is how those bugs start. Times get one owner: this module.
 *
 * The nine slots must stay in sync with the CHECK constraint on
 * appointments.slot_time (supabase/migrations/01_tables.sql).
 */

export const SLOTS = [
  { label: "9:00 AM", value: "09:00" },
  { label: "9:45 AM", value: "09:45" },
  { label: "10:30 AM", value: "10:30" },
  { label: "11:15 AM", value: "11:15" },
  { label: "1:00 PM", value: "13:00" },
  { label: "1:45 PM", value: "13:45" },
  { label: "2:30 PM", value: "14:30" },
  { label: "3:15 PM", value: "15:15" },
  { label: "4:00 PM", value: "16:00" },
] as const;

export type SlotLabel = (typeof SLOTS)[number]["label"];
export type SlotValue = (typeof SLOTS)[number]["value"];

/** Display labels in clinic order — what the <Select> and timetable render. */
export const slotLabels = SLOTS.map((s) => s.label);

/** Type guard for validating a submitted time against the offered slots. */
export function isSlotLabel(value: string): value is SlotLabel {
  return (slotLabels as readonly string[]).includes(value);
}

/**
 * "9:00 AM" -> "09:00". Returns null for anything not in SLOTS, so a bad value
 * fails at the boundary with a readable error rather than as a Postgres CHECK
 * violation three layers down.
 */
export function labelToSlotTime(label: string): SlotValue | null {
  return SLOTS.find((s) => s.label === label)?.value ?? null;
}

/**
 * "09:00" -> "9:00 AM".
 *
 * Postgres `time` columns come back from PostgREST as "09:00:00", so trim any
 * seconds before matching.
 */
export function slotTimeToLabel(value: string): SlotLabel | null {
  const hhmm = value.slice(0, 5);
  return SLOTS.find((s) => s.value === hhmm)?.label ?? null;
}
