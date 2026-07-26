-- =============================================================================
-- 12 — Contact inquiries
-- =============================================================================
-- A public "send us a message" form for visitors who aren't ready to book an
-- appointment yet. Unlike appointments, no account is required to submit one
-- — so RLS has to allow an anonymous INSERT, a genuinely different shape of
-- policy from everything else in this schema.
--
-- Run this the same way as the others: paste into the SQL Editor and Run.
-- =============================================================================

create table public.contact_inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) >= 2),
  email      text not null,
  phone      text,
  message    text not null check (
               char_length(trim(message)) >= 10 and char_length(message) <= 1000
             ),
  status     text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

comment on table public.contact_inquiries is
  'Messages from the public contact form. No account required to submit — see the INSERT policy below.';

alter table public.contact_inquiries enable row level security;

-- Anyone — logged in or not — can submit a message. There's no way to scope
-- this to "your own rows" the way appointments are scoped to user_id, because
-- there may be no user at all. The CHECK constraints above are the only real
-- guardrail against garbage submissions — this table has no CAPTCHA and no
-- rate limit. Acceptable for a clinic's message form at this scale; revisit
-- before treating this as a public-internet-scale intake path.
create policy "Anyone can submit an inquiry"
  on public.contact_inquiries for insert
  to anon, authenticated
  with check ( true );

-- Reuses is_staff() from script 10 — the same helper every other staff-only
-- policy in this schema calls, so a future role change there is automatically
-- reflected here too.
create policy "Staff can view inquiries"
  on public.contact_inquiries for select
  to authenticated
  using ( (select public.is_staff()) );

create policy "Staff can update inquiries"
  on public.contact_inquiries for update
  to authenticated
  using      ( (select public.is_staff()) )
  with check ( (select public.is_staff()) );

-- No DELETE policy: archive, don't delete, matching the soft-close convention
-- already used for appointments.

create index contact_inquiries_status_idx on public.contact_inquiries (status, created_at desc);
