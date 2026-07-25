-- =============================================================================
-- 06 — Privacy-safe availability lookup
-- =============================================================================
-- The portal timetable needs to show which slots are already taken. But RLS
-- (correctly) hides other families' appointments, so a normal query returns
-- only your own — every other slot would look free.
--
-- A `security definer` function runs with the FUNCTION OWNER's privileges
-- rather than the caller's, which means it bypasses RLS. That is exactly why it
-- must return the absolute minimum: three non-identifying columns and nothing
-- else.
--
-- This preserves the property the original design was built around. From
-- lib/schedule-data.ts:
--   "Deliberately carries no patient-identifying field of any kind — only
--    day/time/service — so the timetable has nothing to leak even by accident."
-- =============================================================================

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
    and a.status in ('pending', 'approved');
$$;

comment on function public.get_booked_slots(date, date) is
  'Returns occupied slots with NO patient-identifying data. Never add columns to the return type.';

-- Lock down who may call it. `revoke ... from public` first, because Postgres
-- grants EXECUTE to everyone by default — including anon.
revoke all on function public.get_booked_slots(date, date) from public, anon;
grant execute on function public.get_booked_slots(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- ⚠  security definer is a deliberate hole in your own security model.
--
-- Every column you add to that `returns table` list is a column you have chosen
-- to expose to every logged-in user on the internet. Adding patient_name,
-- guardian_name, contact_email, or notes here would leak other families' data
-- to anyone who can sign up. Don't. If the timetable needs more detail, it
-- needs it about the CALLER'S OWN appointments — query the table directly for
-- that and let RLS do its job.
-- -----------------------------------------------------------------------------
