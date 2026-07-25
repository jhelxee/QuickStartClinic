-- =============================================================================
-- 05 — Status transition guard
-- =============================================================================
-- RLS answers "which ROWS may this user update?" It cannot answer "which
-- CHANGES are legal?" — a policy has no way to compare the old value to the
-- new one.
--
-- That gap is exploitable. The UPDATE policy in script 04 lets a patient modify
-- their own appointment, which is what we want for cancelling. But nothing so
-- far stops them opening DevTools and sending:
--
--   PATCH /rest/v1/appointments?id=eq.<their-own-id>
--   { "status": "approved" }
--
-- They own the row, so RLS allows it, and they've just approved their own
-- booking without the clinic ever seeing it. A trigger closes that hole,
-- because triggers CAN see both OLD and NEW.
-- =============================================================================

create or replace function public.guard_appointment_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Staff and admin tooling bypass this guard. PostgREST switches the Postgres
  -- role to match the key in use: 'authenticated' for a logged-in patient,
  -- 'service_role' for a server-side staff key. The SQL Editor runs as
  -- 'postgres'. Only the patient path is restricted below.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  -- Rule 1: a patient may move their appointment to 'cancelled' and nowhere
  -- else. 'approved' and 'completed' belong to the clinic.
  if new.status is distinct from old.status and new.status <> 'cancelled' then
    raise exception 'Patients can only cancel an appointment (attempted: %)', new.status
      using errcode = 'check_violation';
  end if;

  -- Rule 2: a closed appointment stays closed. Without this, a patient could
  -- un-cancel a booking whose slot the clinic has already given away.
  if old.status in ('cancelled', 'completed') then
    raise exception 'This appointment is closed and can no longer be changed'
      using errcode = 'check_violation';
  end if;

  -- Rule 3: ownership and doctor assignment are not the patient's to reassign.
  -- (RLS already blocks handing the row to another user, since with check would
  -- fail — but this also stops them switching their own booking to a different
  -- doctor, which would sidestep the double-booking index.)
  if new.user_id <> old.user_id or new.doctor_id <> old.doctor_id then
    raise exception 'This field cannot be changed'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.guard_appointment_update() is
  'Enforces legal status transitions for patients. RLS controls which rows; this controls which changes.';

create trigger appointments_guard
  before update on public.appointments
  for each row execute function public.guard_appointment_update();
