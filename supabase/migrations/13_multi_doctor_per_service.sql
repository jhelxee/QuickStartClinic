-- =============================================================================
-- 13 — Multiple doctors per specialty
-- =============================================================================
-- Until now, `doctors.service_slug` was `unique` — exactly one doctor per
-- specialty, which is what let every booking path resolve "Doctor in Charge"
-- with a plain `.eq("service_slug", ...).single()`. This relaxes that so a
-- specialty can have several doctors, and adds the function that replaces
-- those `.single()` lookups: resolve_doctor() picks the patient's usual
-- doctor for that service when possible, otherwise whoever's least busy.
--
-- Run this the same way as the others: paste into the SQL Editor and Run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. service_slug: unique -> just a valid-value check
-- -----------------------------------------------------------------------------
-- appointments_no_double_booking (script 01) is already keyed on doctor_id, not
-- service_slug, so collision prevention doesn't change here at all — two
-- doctors sharing a specialty each still get their own independent
-- double-booking guard.
alter table public.doctors drop constraint doctors_service_slug_key;

alter table public.doctors
  add constraint doctors_service_slug_check
  check (service_slug in (
    'developmental-pediatrician',
    'speech-therapy',
    'occupational-therapy'
  ));

comment on column public.doctors.service_slug is
  'One of the three services. No longer unique — a specialty can have several doctors; see resolve_doctor().';


-- -----------------------------------------------------------------------------
-- 2. resolve_doctor — usual doctor first, else lowest-load active doctor
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER because picking "usual doctor" and "load this week" both
-- require reading across every family's appointments, which RLS otherwise
-- restricts to the caller's own rows. Narrow return: one uuid, nothing else.
--
-- Concurrency: this is one atomic read, no lock — it does not itself prevent
-- two simultaneous bookings from resolving to the same doctor+slot. That race
-- is what appointments_no_double_booking (a real constraint) guards against.
-- Callers are expected to retry once — re-resolve, re-insert — if the insert
-- that follows this call fails with 23505. See app/actions/appointments.ts
-- and app/actions/admin.ts for that retry.
--
-- p_user_id may be NULL (a staff phone booking with no linked account) — with
-- no patient to have a "usual doctor", it goes straight to round-robin.
create or replace function public.resolve_doctor(
  p_user_id uuid,
  p_service text,
  p_date date,
  p_time time
)
returns uuid
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_usual_doctor uuid;
  v_doctor uuid;
begin
  -- Step 1: continuity of care. This patient's most recent doctor for this
  -- exact service — any status, since even a cancelled visit tells you who
  -- the family usually sees — as long as that doctor is still active and free
  -- at the requested date+time.
  if p_user_id is not null then
    select a.doctor_id into v_usual_doctor
    from public.appointments a
    join public.doctors d on d.id = a.doctor_id
    where a.user_id = p_user_id
      and a.service = p_service
      and d.is_active
    order by a.scheduled_date desc, a.created_at desc
    limit 1;

    if v_usual_doctor is not null then
      if not exists (
        select 1 from public.appointments a
        where a.doctor_id = v_usual_doctor
          and a.scheduled_date = p_date
          and a.slot_time = p_time
          and a.status in ('pending', 'approved')
      ) then
        return v_usual_doctor;
      end if;
    end if;
  end if;

  -- Step 2: round-robin by load. Every active doctor for this service who is
  -- free at the requested slot, ranked by how many pending/approved bookings
  -- they already carry this week (Mon-Sun containing p_date), fewest first.
  -- Tie-break is deterministic (created_at, then id) rather than random, so
  -- "why did this booking land on Dr. X" always has a reproducible answer.
  select d.id into v_doctor
  from public.doctors d
  where d.service_slug = p_service
    and d.is_active
    and not exists (
      select 1 from public.appointments a
      where a.doctor_id = d.id
        and a.scheduled_date = p_date
        and a.slot_time = p_time
        and a.status in ('pending', 'approved')
    )
  order by (
    select count(*) from public.appointments a
    where a.doctor_id = d.id
      and a.status in ('pending', 'approved')
      and a.scheduled_date >= date_trunc('week', p_date)::date
      and a.scheduled_date <  date_trunc('week', p_date)::date + 7
  ) asc,
  d.created_at asc,
  d.id asc
  limit 1;

  return v_doctor; -- NULL if no active doctor is free at this slot for this service
end;
$$;

comment on function public.resolve_doctor(uuid, text, date, time) is
  'Picks a doctor for a new booking: usual doctor for this patient+service if active and free, else the active doctor for that service with the fewest bookings this week among those free at the requested slot. Returns NULL if nobody qualifies.';

revoke all on function public.resolve_doctor(uuid, text, date, time) from public, anon;
grant execute on function public.resolve_doctor(uuid, text, date, time) to authenticated;


-- -----------------------------------------------------------------------------
-- 3. doctor_roster — public, presence-free doctor list for the marketing site
-- -----------------------------------------------------------------------------
-- doctor_presence() (script 10) is authenticated-only, so it returns nothing
-- for a logged-out visitor. The public landing page still needs to list every
-- active doctor per specialty even when nobody's signed in — this is that
-- list, with no last_seen_at/user_id/in_clinic, same narrow-columns
-- discipline as every other SECURITY DEFINER function here.
create or replace function public.doctor_roster()
returns table (
  id uuid,
  name text,
  specialty text,
  service_slug text,
  available_days text[]
)
language sql
security definer
set search_path = ''
stable
as $$
  select d.id, d.name, d.specialty, d.service_slug, d.available_days
  from public.doctors d
  where d.is_active
  order by d.specialty, d.name;
$$;

comment on function public.doctor_roster() is
  'Public, presence-free doctor roster for the marketing site. No last_seen_at, no user_id, no in_clinic — see doctor_presence() for the authenticated live-status version.';

revoke all on function public.doctor_roster() from public;
grant execute on function public.doctor_roster() to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. Verify
-- -----------------------------------------------------------------------------
-- select conname, contype from pg_constraint
-- where conrelid = 'public.doctors'::regclass;
-- Expect: doctors_service_slug_check (c), no doctors_service_slug_key (u).
