-- =============================================================================
-- 11 — Close a presence leak on the doctors table
-- =============================================================================
-- BUG THIS FIXES
--
-- Script 04 gave `doctors` a public SELECT policy so the marketing pages could
-- list providers. Script 10 then added `last_seen_at` and `user_id` to that
-- same table — and RLS is ROW-level, not COLUMN-level, so both new columns
-- silently inherited public read access.
--
-- The result: doctor_presence() was carefully locked to `authenticated` and
-- carefully returns a boolean instead of a timestamp... while anyone on the
-- internet could simply ask for the timestamp directly:
--
--   GET /rest/v1/doctors?select=name,last_seen_at     <- worked, unauthenticated
--
-- That exposes exactly what the function was written to protect: a minute-by-
-- minute record of when each clinician arrives, breaks, and leaves.
--
-- THE GENERAL LESSON
-- A policy is written against a table, but it grants access to whatever columns
-- that table happens to have — including ones added months later by someone who
-- never read the policy. Adding a column to a table with a permissive SELECT
-- policy is a disclosure decision, whether or not you thought of it that way.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Doctors are no longer readable by anonymous visitors
-- -----------------------------------------------------------------------------
-- Safe to tighten: nothing public actually queries this table. The landing page
-- renders its provider card from the `doctorSchedule` constant in
-- lib/schedule-data.ts, not from the database. Every real reader — booking,
-- portal, admin — is signed in.
-- -----------------------------------------------------------------------------
drop policy if exists "Anyone can view doctors" on public.doctors;

create policy "Signed-in users can view doctors"
  on public.doctors for select
  to authenticated
  using ( true );


-- -----------------------------------------------------------------------------
-- 2. Column-level privileges for the presence internals
-- -----------------------------------------------------------------------------
-- RLS cannot express "you may read these columns but not those" — that needs
-- Postgres column privileges, which PostgREST enforces.
--
-- Note the order: you cannot revoke a single column while a TABLE-level grant
-- is in place, because the table grant already covers every column. The table
-- grant has to go first, then the safe columns are granted back explicitly.
--
-- After this, `select=last_seen_at` fails with "permission denied" for everyone
-- coming through the API, and the only way to learn presence is the boolean
-- from doctor_presence().
-- -----------------------------------------------------------------------------
revoke select on public.doctors from anon, authenticated;

grant select (id, name, specialty, service_slug, available_days, is_active)
  on public.doctors to authenticated;

-- Writes stay admin-only via the policies from script 10. Those need column
-- privileges too, or an admin could pass the policy and still be refused.
grant insert (name, specialty, service_slug, available_days, is_active)
  on public.doctors to authenticated;
grant update (name, specialty, service_slug, available_days, is_active, user_id, last_seen_at)
  on public.doctors to authenticated;


-- -----------------------------------------------------------------------------
-- 3. Admins read master data through a function
-- -----------------------------------------------------------------------------
-- The admin screen needs `user_id` (to show which account is linked) and the
-- derived presence flag. Column privileges apply to the whole `authenticated`
-- role and can't be granted to admins alone, so admins go through a function
-- guarded by is_admin() instead.
--
-- Same pattern as find_family_by_email: security definer bypasses RLS, so the
-- authorisation check lives in the body. Without `where public.is_admin()`,
-- every signed-in patient could call this and read the account links.
-- -----------------------------------------------------------------------------
create or replace function public.doctor_master()
returns table (
  id uuid,
  name text,
  specialty text,
  service_slug text,
  available_days text[],
  is_active boolean,
  user_id uuid,
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
    d.is_active,
    d.user_id,
    (d.last_seen_at is not null and d.last_seen_at > now() - public.presence_window())
  from public.doctors d
  where public.is_admin()
  order by d.name;
$$;

comment on function public.doctor_master() is
  'Full doctor master data for administrators. Returns derived presence, never last_seen_at.';

revoke all on function public.doctor_master() from public, anon;
grant execute on function public.doctor_master() to authenticated;


-- -----------------------------------------------------------------------------
-- 4. Verify the leak is closed
-- -----------------------------------------------------------------------------
-- As an anonymous visitor, all three of these must now fail or return nothing:
--
--   GET /rest/v1/doctors?select=name              -> [] (policy: authenticated only)
--   GET /rest/v1/doctors?select=last_seen_at      -> permission denied for column
--   POST /rest/v1/rpc/doctor_presence             -> permission denied for function
--
-- As a signed-in CLIENT:
--
--   GET /rest/v1/doctors?select=name              -> the doctor list
--   GET /rest/v1/doctors?select=last_seen_at      -> permission denied for column
--   POST /rest/v1/rpc/doctor_presence             -> names + in_clinic booleans
--   POST /rest/v1/rpc/doctor_master               -> [] (is_admin() is false)
--
-- Check the column grants:
--   select grantee, privilege_type, column_name
--   from information_schema.column_privileges
--   where table_name = 'doctors' and grantee in ('anon','authenticated')
--   order by grantee, column_name;
