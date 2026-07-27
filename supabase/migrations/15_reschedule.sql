-- =============================================================================
-- 15 — Reschedule support
-- =============================================================================
-- Until now, guard_appointment_update() restricted what a PATIENT could do to
-- the *status* column only — it never looked at scheduled_date/slot_time at
-- all. That's a real gap: a patient could already move their own appointment
-- to a new date/time via a direct PATCH (RLS's "Users can update own
-- appointments" allows it), and nothing would reset it back to pending —
-- an already-approved slot could be silently moved without staff ever
-- reviewing the new time.
--
-- This closes that gap at the same layer every other appointment rule lives
-- at: the database, not app code. Staff/doctor/admin are unaffected — they
-- already bypass this trigger entirely via is_staff().
--
-- Run this the same way as the others: paste into the SQL Editor and Run.
-- =============================================================================

create or replace function public.guard_appointment_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  -- Clinic staff may make any status transition, including moving the
  -- date/time, without the pending reset below — they're the ones doing the
  -- confirming.
  if public.is_staff() then
    return new;
  end if;

  -- Everything below applies to patients.
  if new.status is distinct from old.status and new.status <> 'cancelled' then
    raise exception 'Patients can only cancel an appointment (attempted: %)', new.status
      using errcode = 'check_violation';
  end if;

  if old.status in ('cancelled', 'completed') then
    raise exception 'This appointment is closed and can no longer be changed'
      using errcode = 'check_violation';
  end if;

  if new.user_id <> old.user_id or new.doctor_id <> old.doctor_id then
    raise exception 'This field cannot be changed'
      using errcode = 'check_violation';
  end if;

  -- NEW: a patient may move their own appointment to a new date or time —
  -- but doing so forces it back to 'pending', regardless of what status was
  -- sent in the same request. A patient's own edit can request a new slot;
  -- it can never silently keep an already-confirmed one without the clinic
  -- looking at it again.
  if new.scheduled_date is distinct from old.scheduled_date
     or new.slot_time is distinct from old.slot_time then
    new.status := 'pending';
  end if;

  return new;
end;
$$;

comment on function public.guard_appointment_update() is
  'Enforces legal changes for patients: status may only move to cancelled, a closed booking stays closed, ownership/assignment are frozen, and moving date/time forces the row back to pending. Staff bypass this entirely via is_staff().';
