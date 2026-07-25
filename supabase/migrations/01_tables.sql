-- =============================================================================
-- 01 — Tables
-- =============================================================================
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Expected result: "Success. No rows returned."
--
-- Three tables:
--   profiles     — account master, one row per registered user (the guardian)
--   doctors      — reference data, seeded with the clinic's three providers
--   appointments — patient schedule records
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PROFILES — app-specific account data, linked 1:1 to auth.users
-- -----------------------------------------------------------------------------
-- Why a separate table? auth.users belongs to Supabase: you can't add columns
-- to it, and it isn't exposed through the REST API. So we keep our own table in
-- the public schema and share its primary key with auth.users.
--
-- The password is NOT here. Supabase stores a bcrypt hash in
-- auth.users.encrypted_password and manages it for us. Never add a password
-- column to this table.
--
-- Columns mirror the Create Account form (registerSchema in lib/validation.ts).
-- -----------------------------------------------------------------------------
create table public.profiles (
  -- Same UUID as the auth user. `on delete cascade` means deleting the account
  -- automatically removes this row (and, via a second cascade, its appointments).
  id            uuid primary key references auth.users(id) on delete cascade,

  email         text not null,
  legal_name    text not null check (char_length(trim(legal_name)) >= 2),

  -- Matches the form's "you must be 18 or older to register" rule. Constraints
  -- here are a backstop: client-side validation can be bypassed, this cannot.
  date_of_birth date not null check (date_of_birth <= current_date - interval '18 years'),

  sex           text not null check (sex in ('female', 'male', 'prefer_not_to_say')),
  residence     text not null check (char_length(trim(residence)) >= 3),
  phone         text not null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Account master. Mirrors the Create Account form. Passwords live hashed in auth.users, never here.';


-- -----------------------------------------------------------------------------
-- DOCTORS — reference data
-- -----------------------------------------------------------------------------
-- service_slug must match the values in serviceOptions (lib/validation.ts)
-- exactly. That match is what lets us auto-assign the "Doctor in Charge" from
-- the service the patient picked, without adding a doctor field to the form.
-- -----------------------------------------------------------------------------
create table public.doctors (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  specialty      text not null,
  service_slug   text not null unique,
  available_days text[] not null default '{}',
  created_at     timestamptz not null default now()
);

comment on table public.doctors is
  'Clinic providers. Publicly readable, writable only from the SQL Editor.';

-- Seeded from doctorSchedule in lib/schedule-data.ts.
insert into public.doctors (name, specialty, service_slug, available_days) values
  ('Dr. Chen',    'Developmental Pediatrician', 'developmental-pediatrician',
   '{Monday,Tuesday,Wednesday,Thursday,Friday}'),
  ('Ms. Alvarez', 'Speech Therapy',             'speech-therapy',
   '{Monday,Wednesday,Friday}'),
  ('Mr. Boone',   'Occupational Therapy',       'occupational-therapy',
   '{Tuesday,Thursday,Saturday}');


-- -----------------------------------------------------------------------------
-- APPOINTMENTS — patient schedule records
-- -----------------------------------------------------------------------------
create table public.appointments (
  id             uuid primary key default gen_random_uuid(),

  -- The logged-in account holder (the parent/guardian who booked).
  -- THIS is the ownership column every RLS policy checks against auth.uid().
  user_id        uuid not null references auth.users(id) on delete cascade,

  -- "Doctor in Charge" — resolved from `service` when the booking is created.
  -- `on delete restrict` stops anyone deleting a doctor who still has bookings.
  doctor_id      uuid not null references public.doctors(id) on delete restrict,

  -- Stored as the slug ('speech-therapy'), never the display label
  -- ('Speech Therapy'). The UI turns slugs into labels; the database holds one
  -- canonical value.
  service        text not null check (service in (
                   'developmental-pediatrician',
                   'speech-therapy',
                   'occupational-therapy')),

  -- The child being seen — distinct from the account holder above, so one
  -- parent can book for several children from a single login.
  patient_name   text not null check (char_length(trim(patient_name)) >= 2),
  patient_dob    date check (patient_dob <= current_date),
  patient_age    int  check (patient_age between 0 and 17),

  guardian_name  text not null,
  contact_phone  text not null,
  contact_email  text not null,

  scheduled_date date not null,

  -- A real `time` value ('09:00'), not the display string ('9:00 AM') — text
  -- would sort "10:30 AM" before "9:00 AM". lib/slots.ts converts between them.
  slot_time      time not null check (slot_time in (
                   '09:00', '09:45', '10:30', '11:15',
                   '13:00', '13:45', '14:30', '15:15', '16:00')),

  -- pending -> approved -> completed, with cancelled reachable from the first
  -- two. A check constraint rather than a Postgres enum: adding a value later
  -- is a one-line alter instead of a migration.
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'completed', 'cancelled')),

  notes          text check (char_length(notes) <= 600),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- The form offers date-of-birth OR age, never both and never neither.
  constraint patient_dob_or_age check (
    (patient_dob is not null and patient_age is null) or
    (patient_dob is null     and patient_age is not null)
  ),

  -- The clinic is closed Sunday (see officeHours in lib/schedule-data.ts).
  -- extract(dow) returns 0 for Sunday.
  constraint no_sunday check (extract(dow from scheduled_date) <> 0)
);

comment on table public.appointments is
  'Patient schedule records. user_id is the account holder; patient_name is the child.';

-- Stops two families booking the same doctor at the same moment. Partial, so a
-- cancelled booking releases the slot for someone else.
create unique index appointments_no_double_booking
  on public.appointments (doctor_id, scheduled_date, slot_time)
  where status in ('pending', 'approved');

-- Makes "show me my upcoming appointments" fast as the table grows.
create index appointments_user_date_idx
  on public.appointments (user_id, scheduled_date desc);

-- Supports the availability lookup in get_booked_slots (script 06).
create index appointments_date_idx
  on public.appointments (scheduled_date)
  where status in ('pending', 'approved');
