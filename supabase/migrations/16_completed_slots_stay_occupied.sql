-- =============================================================================
-- 16 — Completed appointments still occupy their slot
-- =============================================================================
-- Two places only ever counted 'pending'/'approved' as "this slot is taken":
--
--   1. get_booked_slots() — feeds the patient-facing "Occupied" label
--   2. appointments_no_double_booking — the actual double-booking guard
--
-- Both silently excluded 'completed' appointments. That's wrong on both
-- ends: a completed visit still really happened at that doctor+date+time,
-- so (1) other families should still see it as Occupied, not Available, and
-- (2) nothing should be allowed to double-book into it after the fact.
-- 'cancelled' is correctly still excluded from both — that's the one status
-- that genuinely frees a slot back up.
--
-- Run this the same way as the others: paste into the SQL Editor and Run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. get_booked_slots()
-- -----------------------------------------------------------------------------
-- Same return columns as before, so create or replace is fine here — no
-- drop/recreate needed (that's only required when the OUT columns change).
create or replace function public.get_booked_slots(from_date date, to_date date)
returns table (slot_date date, booked_time time, doctor_id uuid)
language sql
security definer
set search_path = ''
stable
as $$
  select a.scheduled_date, a.slot_time, a.doctor_id
  from public.appointments a
  where a.scheduled_date between from_date and to_date
    and a.status in ('pending', 'approved', 'completed');
$$;

revoke all on function public.get_booked_slots(date, date) from public, anon;
grant execute on function public.get_booked_slots(date, date) to authenticated;


-- -----------------------------------------------------------------------------
-- 2. appointments_no_double_booking
-- -----------------------------------------------------------------------------
drop index if exists appointments_no_double_booking;

create unique index appointments_no_double_booking
  on public.appointments (doctor_id, scheduled_date, slot_time)
  where status in ('pending', 'approved', 'completed');


-- -----------------------------------------------------------------------------
-- 3. verify
-- -----------------------------------------------------------------------------
-- Should show status in ('pending','approved','completed') in the index
-- definition, not just the first two:
-- select indexdef from pg_indexes where indexname = 'appointments_no_double_booking';
