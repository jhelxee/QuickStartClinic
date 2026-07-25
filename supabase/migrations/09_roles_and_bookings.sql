-- =============================================================================
-- 09 — Three roles (client / staff / admin) + staff-recorded bookings
-- =============================================================================
-- Replaces the is_staff boolean from script 08 with a proper role column, and
-- adds phone/walk-in bookings.
--
-- Run this AFTER 08_staff_role.sql. It is written to be safe on a database
-- where 08 has already been applied — which yours has.
--
-- The order of operations below matters: `is_staff` cannot be dropped while an
-- index or a SQL-language function still references it, so those are rebuilt
-- against `role` first.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. The role column
-- -----------------------------------------------------------------------------
-- A text column with a CHECK rather than a Postgres enum: adding a fourth role
-- later ('nurse', 'billing') is a one-line ALTER instead of a type migration.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'client'
  check (role in ('client', 'staff', 'admin'));

comment on column public.profiles.role is
  'client = family, staff = clinic staff, admin = clinic administrator. Writable only from the SQL Editor.';

-- Carry over anyone already marked staff under the old boolean.
update public.profiles set role = 'staff' where is_staff and role = 'client';

create index if not exists profiles_role_idx
  on public.profiles (id) where role <> 'client';


-- -----------------------------------------------------------------------------
-- 2. Rebuild the helpers against `role`
-- -----------------------------------------------------------------------------
-- is_staff() keeps its NAME on purpose. Every policy written in script 08 calls
-- it, so redefining the body migrates all of them at once — no policy has to be
-- dropped and recreated, and nothing is briefly unprotected mid-migration.
--
-- It now means "staff OR admin", because an admin is a superset of staff.
-- -----------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select p.role in ('staff', 'admin') from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

comment on function public.is_staff() is
  'True for staff and admin. Named for the policies in script 08 that call it.';

-- For anything only an administrator should do. Nothing uses it yet — it's here
-- so the distinction exists in the database the day you need it.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- -----------------------------------------------------------------------------
-- 3. Freeze `role` against API writes  ** THE IMPORTANT ONE **
-- -----------------------------------------------------------------------------
-- Exactly the same hole script 08 closed for is_staff, and for the same reason:
-- "Users can update own profile" does not care WHICH column changes, so without
-- this a client could PATCH their own row to role = 'admin'.
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
    raise exception 'role cannot be changed through the API'
      using errcode = 'check_violation';
  end if;

  if new.id is distinct from old.id then
    raise exception 'id cannot be changed'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 4. Retire the boolean
-- -----------------------------------------------------------------------------
drop index if exists public.profiles_staff_idx;

alter table public.profiles drop column if exists is_staff;


-- -----------------------------------------------------------------------------
-- 5. Bookings that belong to no account (phone / walk-in)
-- -----------------------------------------------------------------------------
-- Privacy still holds without a new rule, because of how SQL treats null: the
-- client policy is `auth.uid() = user_id`, and `<uuid> = null` evaluates to
-- NULL, not true. An ownerless row therefore matches no client, ever — only the
-- "Staff can view all appointments" policy returns it.
--
-- A client also cannot exploit the nullable column to create an anonymous
-- booking: for them `auth.uid() = null` is NULL, so the insert is refused.
-- -----------------------------------------------------------------------------
alter table public.appointments
  alter column user_id drop not null;

comment on column public.appointments.user_id is
  'Account holder. NULL for phone/walk-in bookings recorded by staff — visible to staff only.';

alter table public.appointments
  add column if not exists booked_by_staff uuid references auth.users(id) on delete set null;

comment on column public.appointments.booked_by_staff is
  'Staff member who recorded this booking. NULL when the family booked it themselves.';

drop policy if exists "Staff can book for anyone" on public.appointments;
create policy "Staff can book for anyone"
  on public.appointments for insert
  to authenticated
  with check ( (select public.is_staff()) );


-- -----------------------------------------------------------------------------
-- 6. Look up a family by email without exposing the profiles table
-- -----------------------------------------------------------------------------
-- Script 08 gave staff NO read access to `profiles`, and that still holds. This
-- returns two columns for one exact email match — enough to attach a phone
-- booking to an existing account, and nothing more.
--
-- NOTE the `where public.is_staff()` INSIDE the query. security definer bypasses
-- RLS, so without it any logged-in client could call this and test whether an
-- address is registered at a paediatric clinic. There is no policy protecting a
-- function — the guard has to live in the body.
-- -----------------------------------------------------------------------------
create or replace function public.find_family_by_email(lookup_email text)
returns table (id uuid, legal_name text)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.legal_name
  from public.profiles p
  where public.is_staff()
    and lower(p.email) = lower(trim(lookup_email))
  limit 1;
$$;

revoke all on function public.find_family_by_email(text) from public, anon;
grant execute on function public.find_family_by_email(text) to authenticated;


-- -----------------------------------------------------------------------------
-- 7. Stamp who took the booking
-- -----------------------------------------------------------------------------
-- Set by the database rather than trusted from the client, so the audit trail
-- cannot be forged by whoever calls the API.
-- -----------------------------------------------------------------------------
create or replace function public.stamp_booked_by_staff()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is distinct from auth.uid() then
    new.booked_by_staff = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_stamp_staff on public.appointments;
create trigger appointments_stamp_staff
  before insert on public.appointments
  for each row execute function public.stamp_booked_by_staff();


-- -----------------------------------------------------------------------------
-- 8. Assign roles
-- -----------------------------------------------------------------------------
-- The ONLY way to grant staff or admin. The API cannot (see step 3).
-- -----------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'you@example.com';
-- update public.profiles set role = 'staff' where email = 'coordinator@example.com';

-- Who has what:
-- select email, legal_name, role from public.profiles order by role, email;
