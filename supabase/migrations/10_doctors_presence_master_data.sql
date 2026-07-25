-- =============================================================================
-- 10 — Doctor role, clinic presence, and admin master data
-- =============================================================================
-- Run after 09_roles_and_bookings.sql.
--
-- Three things:
--   1. `doctor` becomes a role, and doctors get linked to login accounts
--   2. Presence — whether a doctor is currently in the clinic
--   3. Admin-only control of the doctor list, availability, and staff roles
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Doctor is a role, and it counts as staff
-- -----------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('client', 'staff', 'doctor', 'admin'));

comment on column public.profiles.role is
  'client = family, staff = coordinator, doctor = clinician (also staff), admin = administrator.';

-- Redefining the body migrates every policy written in scripts 08/09 at once,
-- because they all call this function by name. Doctors now pass the same
-- clinic-side checks staff do.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select p.role in ('staff', 'doctor', 'admin') from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

comment on function public.is_staff() is
  'True for staff, doctor, and admin — everyone who works the clinic side.';

create or replace function public.is_doctor()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select p.role = 'doctor' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_doctor() from public, anon;
grant execute on function public.is_doctor() to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Master data columns on doctors
-- -----------------------------------------------------------------------------
-- user_id links a doctor RECORD to a login ACCOUNT. Without it there is no way
-- to know whose session belongs to which doctor, so presence can't work.
-- -----------------------------------------------------------------------------
alter table public.doctors
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

alter table public.doctors
  add column if not exists is_active boolean not null default true;

-- Presence. Deliberately a TIMESTAMP, not a boolean.
--
-- A boolean "is_online" would be a lie the moment anything goes wrong: a laptop
-- closing, a dropped connection, or a crashed tab all leave it stuck on `true`
-- forever, and the clinic would show a doctor as present overnight. A timestamp
-- decays on its own — if nothing refreshes it, presence simply expires.
alter table public.doctors
  add column if not exists last_seen_at timestamptz;

comment on column public.doctors.user_id is
  'The doctor login this record belongs to. NULL until an admin links an account.';
comment on column public.doctors.is_active is
  'False retires a doctor from booking without deleting their history.';
comment on column public.doctors.last_seen_at is
  'Last heartbeat from the doctor app. Presence is derived from this, never stored as a flag.';


-- -----------------------------------------------------------------------------
-- 3. How long a heartbeat counts for
-- -----------------------------------------------------------------------------
-- One definition, used by every reader, so the app and the database can never
-- disagree about what "in clinic" means.
-- -----------------------------------------------------------------------------
create or replace function public.presence_window()
returns interval
language sql
immutable
as $$ select interval '5 minutes' $$;


-- -----------------------------------------------------------------------------
-- 4. The heartbeat
-- -----------------------------------------------------------------------------
-- security definer so a doctor can stamp their own row without an UPDATE policy
-- on `doctors` — which would otherwise let them rename themselves or change
-- their own availability. This touches exactly one column on exactly their row.
-- -----------------------------------------------------------------------------
create or replace function public.touch_presence()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.doctors
  set last_seen_at = now()
  where user_id = auth.uid();
$$;

comment on function public.touch_presence() is
  'Heartbeat from a signed-in doctor. Updates only last_seen_at, only on their own row.';

-- Called on logout so a doctor drops offline immediately rather than lingering
-- for the length of the presence window.
create or replace function public.end_presence()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.doctors
  set last_seen_at = null
  where user_id = auth.uid();
$$;

revoke all on function public.touch_presence() from public, anon;
revoke all on function public.end_presence() from public, anon;
grant execute on function public.touch_presence() to authenticated;
grant execute on function public.end_presence() to authenticated;


-- -----------------------------------------------------------------------------
-- 5. Reading presence — what patients are allowed to see
-- -----------------------------------------------------------------------------
-- Returns a BOOLEAN, never the underlying timestamp. Handing out last_seen_at
-- would let anyone reconstruct a doctor's working pattern minute by minute —
-- when they arrive, when they break, when they leave. Patients need one bit of
-- information: are they here or not.
--
-- Granted to `authenticated` only, so doctor whereabouts are not published to
-- the open internet.
-- -----------------------------------------------------------------------------
create or replace function public.doctor_presence()
returns table (
  doctor_id uuid,
  name text,
  specialty text,
  service_slug text,
  available_days text[],
  in_clinic boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    d.id,
    d.name,
    d.specialty,
    d.service_slug,
    d.available_days,
    (d.last_seen_at is not null and d.last_seen_at > now() - public.presence_window())
  from public.doctors d
  where d.is_active
  order by d.name;
$$;

comment on function public.doctor_presence() is
  'Doctor list with a live in_clinic flag. Returns a boolean, never last_seen_at.';

revoke all on function public.doctor_presence() from public, anon;
grant execute on function public.doctor_presence() to authenticated;


-- -----------------------------------------------------------------------------
-- 6. Admin owns the master data
-- -----------------------------------------------------------------------------
-- Script 04 gave `doctors` a public SELECT and no write policies at all, so the
-- table was editable only from the SQL Editor. These add write access for
-- admins — and only admins. Staff and doctors can read, never write.
-- -----------------------------------------------------------------------------
drop policy if exists "Admins can add doctors" on public.doctors;
create policy "Admins can add doctors"
  on public.doctors for insert
  to authenticated
  with check ( (select public.is_admin()) );

drop policy if exists "Admins can update doctors" on public.doctors;
create policy "Admins can update doctors"
  on public.doctors for update
  to authenticated
  using      ( (select public.is_admin()) )
  with check ( (select public.is_admin()) );

-- No DELETE policy on purpose. Deleting a doctor with bookings would fail the
-- `on delete restrict` foreign key anyway; retire them with is_active = false
-- so the appointment history stays intact.


-- -----------------------------------------------------------------------------
-- 7. Admin manages staff access
-- -----------------------------------------------------------------------------
-- Note this is ADMIN only, not staff. Script 08 deliberately gave staff no read
-- access to profiles, and that still holds — a coordinator has no reason to see
-- every family's date of birth and home address. An administrator assigning
-- roles does.
-- -----------------------------------------------------------------------------
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using ( (select public.is_admin()) );

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  to authenticated
  using      ( (select public.is_admin()) )
  with check ( (select public.is_admin()) );


-- -----------------------------------------------------------------------------
-- 8. Who may change a role
-- -----------------------------------------------------------------------------
-- Replaces the version from script 09, which froze `role` against every API
-- write. Admins now need to assign roles from the app, so the rule becomes:
-- only an admin may change a role, and never their own.
--
-- The self-exclusion is not bureaucracy. It stops the two realistic accidents:
-- an admin demoting themselves and locking everyone out of the admin area, and
-- a stolen admin session quietly promoting itself past whatever review you add
-- later. Role changes always require a second person, or the SQL Editor.
-- -----------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'Only an administrator can change a role'
        using errcode = 'check_violation';
    end if;

    if new.id = auth.uid() then
      raise exception 'You cannot change your own role'
        using errcode = 'check_violation';
    end if;
  end if;

  if new.id is distinct from old.id then
    raise exception 'id cannot be changed'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 9. Set yourself up
-- -----------------------------------------------------------------------------
-- Make yourself admin (only the SQL Editor can do the first one):
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- Then, after a doctor has registered an account, link it from the admin UI or:
--   update public.doctors set user_id = (
--     select id from public.profiles where email = 'dr.chen@example.com'
--   ) where service_slug = 'developmental-pediatrician';
--   update public.profiles set role = 'doctor' where email = 'dr.chen@example.com';
--
-- Check presence by hand:
--   select name, last_seen_at,
--          (last_seen_at > now() - public.presence_window()) as in_clinic
--   from public.doctors order by name;
