-- =============================================================================
-- 08 — Staff role and appointment approval
-- =============================================================================
-- Until now every booking is stuck at 'pending' forever: patients are blocked
-- from approving their own (script 05), and nobody else can either. This adds
-- a staff role so the clinic can actually confirm appointments.
--
-- Run this the same way as the others: paste into the SQL Editor and Run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. The flag
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column is_staff boolean not null default false;

comment on column public.profiles.is_staff is
  'Clinic staff. Grant from the SQL Editor only — the API can never write this (see guard_profile_update).';

create index profiles_staff_idx on public.profiles (id) where is_staff;


-- -----------------------------------------------------------------------------
-- 2. Stop patients promoting themselves  ** READ THIS ONE **
-- -----------------------------------------------------------------------------
-- Script 04 created "Users can update own profile", which lets a signed-in user
-- update their own row. That policy does not care WHICH columns change — so the
-- moment is_staff exists, any patient can run:
--
--   PATCH /rest/v1/profiles?id=eq.<their-own-id>
--   { "is_staff": true }
--
-- ...and grant themselves access to every family's records. RLS cannot stop
-- this: the row genuinely is theirs. Same shape of hole as the status guard in
-- script 05, and it needs the same fix — a trigger that compares OLD to NEW.
-- -----------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Staff grants happen from the SQL Editor (postgres) or a server-side key.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if new.is_staff is distinct from old.is_staff then
    raise exception 'is_staff cannot be changed through the API'
      using errcode = 'check_violation';
  end if;

  if new.id is distinct from old.id then
    raise exception 'id cannot be changed'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.guard_profile_update() is
  'Freezes is_staff and id against API writes. Without this, any patient could self-promote to staff.';

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();


-- -----------------------------------------------------------------------------
-- 3. The helper policies use
-- -----------------------------------------------------------------------------
-- security definer matters here. A staff policy on `profiles` that queried
-- `profiles` would re-trigger the policy that called it — infinite recursion,
-- and Postgres errors out. Running as the owner reads the table without
-- re-evaluating RLS, which breaks the loop.
-- -----------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select p.is_staff from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

comment on function public.is_staff() is
  'True when the caller is clinic staff. security definer to avoid RLS recursion inside policies.';

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;


-- -----------------------------------------------------------------------------
-- 4. Staff can see and update every appointment
-- -----------------------------------------------------------------------------
-- These sit ALONGSIDE the patient policies from script 04. Multiple permissive
-- policies are OR'd together, so a patient still sees their own rows and staff
-- see all rows. Nothing about the patient rules changes.
-- -----------------------------------------------------------------------------
create policy "Staff can view all appointments"
  on public.appointments for select
  to authenticated
  using ( (select public.is_staff()) );

create policy "Staff can update all appointments"
  on public.appointments for update
  to authenticated
  using      ( (select public.is_staff()) )
  with check ( (select public.is_staff()) );

-- Deliberately NOT added: a staff policy on `profiles`. Every appointment row
-- already carries guardian_name, contact_phone, and contact_email, so the
-- approval screen has what it needs. Granting staff read access to all profiles
-- would expose dates of birth and home addresses for no reason. Least privilege.


-- -----------------------------------------------------------------------------
-- 5. Let staff past the status guard
-- -----------------------------------------------------------------------------
-- Script 05 restricts everyone on the `authenticated` role to 'cancelled'.
-- Staff arrive on that same role, so without this they could not approve
-- anything — the trigger would reject them exactly like a patient.
--
-- This replaces the function from script 05; the trigger keeps pointing at it.
-- -----------------------------------------------------------------------------
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

  -- NEW: clinic staff may make any status transition.
  if public.is_staff() then
    return new;
  end if;

  -- Everything below is unchanged from script 05 and applies to patients.
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

  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 6. Make yourself staff
-- -----------------------------------------------------------------------------
-- Replace the email below with your own, then run it. This is the ONLY way to
-- grant staff access — the API cannot, by design (see step 2).
-- -----------------------------------------------------------------------------
-- update public.profiles set is_staff = true where email = 'you@example.com';

-- Check who has it:
-- select email, legal_name, is_staff from public.profiles order by is_staff desc;
