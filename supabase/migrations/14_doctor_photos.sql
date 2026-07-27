-- =============================================================================
-- 14 — Doctor photos
-- =============================================================================
-- A public Storage bucket for doctor headshots, shown on the public "Meet the
-- team" section. Public bucket because that section renders for logged-out
-- visitors too (same reasoning as doctor_roster() in script 13) — these are
-- professional headshots an admin chooses to publish, not sensitive data.
--
-- Run this the same way as the others: paste into the SQL Editor and Run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. photo_url column
-- -----------------------------------------------------------------------------
alter table public.doctors add column if not exists photo_url text;

comment on column public.doctors.photo_url is
  'Public URL of the doctor''s photo in the doctor-photos storage bucket. Null until an admin uploads one — components fall back to initials.';

-- Extends the column grants from script 11 rather than replacing them —
-- those still stand for every other column.
grant insert (photo_url) on public.doctors to authenticated;
grant update (photo_url) on public.doctors to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Storage bucket
-- -----------------------------------------------------------------------------
-- storage.objects already has RLS enabled by default on every Supabase
-- project — no `alter table ... enable row level security` needed here.
insert into storage.buckets (id, name, public)
values ('doctor-photos', 'doctor-photos', true)
on conflict (id) do nothing;

-- Anyone can view — it's a public bucket of headshots for a public page.
create policy "Anyone can view doctor photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'doctor-photos');

-- Only admins can upload, replace, or remove one — same is_admin() helper
-- every other admin-only policy in this schema already uses.
create policy "Admins can upload doctor photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'doctor-photos' and (select public.is_admin()));

create policy "Admins can update doctor photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'doctor-photos' and (select public.is_admin()));

create policy "Admins can delete doctor photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'doctor-photos' and (select public.is_admin()));


-- -----------------------------------------------------------------------------
-- 3. doctor_roster() and doctor_master(): add photo_url to what they return
-- -----------------------------------------------------------------------------
-- Postgres won't let CREATE OR REPLACE change a function's output columns —
-- "cannot change return type of existing function" — so these are dropped
-- and recreated rather than replaced in place. Dropping also drops their
-- grants, so both are re-applied at the end exactly as script 11/13 set them.

drop function if exists public.doctor_roster();

create function public.doctor_roster()
returns table (
  id uuid,
  name text,
  specialty text,
  service_slug text,
  available_days text[],
  photo_url text
)
language sql
security definer
set search_path = ''
stable
as $$
  select d.id, d.name, d.specialty, d.service_slug, d.available_days, d.photo_url
  from public.doctors d
  where d.is_active
  order by d.specialty, d.name;
$$;

comment on function public.doctor_roster() is
  'Public, presence-free doctor roster for the marketing site. No last_seen_at, no user_id, no in_clinic — see doctor_presence() for the authenticated live-status version.';

revoke all on function public.doctor_roster() from public;
grant execute on function public.doctor_roster() to anon, authenticated;


drop function if exists public.doctor_master();

create function public.doctor_master()
returns table (
  id uuid,
  name text,
  specialty text,
  service_slug text,
  available_days text[],
  is_active boolean,
  user_id uuid,
  in_clinic boolean,
  photo_url text
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
    (d.last_seen_at is not null and d.last_seen_at > now() - public.presence_window()),
    d.photo_url
  from public.doctors d
  where public.is_admin()
  order by d.name;
$$;

comment on function public.doctor_master() is
  'Full doctor master data for administrators. Returns derived presence, never last_seen_at.';

revoke all on function public.doctor_master() from public, anon;
grant execute on function public.doctor_master() to authenticated;
