-- =============================================================================
-- 07 — Verify before you trust
-- =============================================================================
-- Do not skip this. Run each block and actually read the output. "It didn't
-- error" is not the same as "it's protecting anything".
-- =============================================================================


-- -----------------------------------------------------------------------------
-- CHECK 1 — RLS is switched on everywhere.
-- Expect: three rows, rowsecurity = true for all of them.
-- A `false` here means that table is readable by anyone holding your anon key.
-- -----------------------------------------------------------------------------
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;


-- -----------------------------------------------------------------------------
-- CHECK 2 — Review every policy you created.
-- Expect 8 rows: 3 on profiles, 1 on doctors, 3 on appointments... and read the
-- `qual` column. That is the actual filter Postgres will apply. If any row
-- shows `true` for a table other than doctors, it is not filtering anything.
-- -----------------------------------------------------------------------------
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;


-- -----------------------------------------------------------------------------
-- CHECK 3 — The one that actually matters.
-- Impersonate a logged-out visitor and try to read patient records.
--
-- Expect: zero rows. Not an error — an empty result. That is RLS silently
-- filtering everything away, which is exactly right.
--
-- If this returns rows, STOP. Do not write any app code until it doesn't.
-- -----------------------------------------------------------------------------
begin;
  set local role anon;
  select * from public.appointments;   -- must be empty
  select * from public.profiles;       -- must be empty
rollback;


-- -----------------------------------------------------------------------------
-- CHECK 4 — anon cannot call the availability function either.
-- Expect: "permission denied for function get_booked_slots".
-- An error here is the PASS condition.
-- -----------------------------------------------------------------------------
begin;
  set local role anon;
  select * from public.get_booked_slots(current_date, current_date + 7);
rollback;


-- -----------------------------------------------------------------------------
-- CHECK 5 — Doctors seeded correctly.
-- Expect: one row per service_slug (there can be more than one doctor per
-- specialty since script 13), active_doctors >= 1 for each, and service_slug
-- values that exactly match serviceOptions in lib/validation.ts. A typo here
-- means bookings fail with "That service isn't available right now."
-- -----------------------------------------------------------------------------
select service_slug, count(*) filter (where is_active) as active_doctors
from public.doctors
group by service_slug
order by service_slug;


-- -----------------------------------------------------------------------------
-- CHECK 6 — After registering your first account through the app, run this.
-- Expect: one row, every column populated, and NO password column anywhere.
-- -----------------------------------------------------------------------------
-- select * from public.profiles;

-- And confirm the profile id matches the auth user id:
-- select u.id, u.email, p.legal_name, p.phone
-- from auth.users u
-- join public.profiles p on p.id = u.id;
