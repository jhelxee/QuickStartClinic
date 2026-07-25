-- =============================================================================
-- 04 — Row Level Security
-- =============================================================================
-- This is the file that actually protects patient data. Read it before running.
--
-- WHY IT MATTERS
-- Your anon key ships inside the browser bundle. It is *meant* to be public —
-- anyone can open DevTools and read it. Without RLS, that key is enough to run
--     select * from appointments
-- and download every family's records. RLS makes Postgres attach an invisible
-- WHERE clause to every single query, based on who is asking.
--
-- auth.uid() returns the logged-in user's UUID, read from their JWT. For a
-- logged-out visitor it returns null, so `auth.uid() = user_id` is never true
-- and they see nothing.
--
-- USING vs WITH CHECK
--   using      — which EXISTING rows you may see or touch (reads, and the
--                "before" side of an update)
--   with check — which rows you may WRITE (inserts, and the "after" side of an
--                update, so you can't edit a row into someone else's name)
-- SELECT needs `using`. INSERT needs `with check`. UPDATE needs both.
-- =============================================================================

alter table public.profiles     enable row level security;
alter table public.doctors      enable row level security;
alter table public.appointments enable row level security;


-- -----------------------------------------------------------------------------
-- PROFILES — you can only ever see and edit your own account
-- -----------------------------------------------------------------------------
-- Two details worth understanding, used throughout this file:
--
--   `to authenticated`  — skips evaluating the policy for logged-out visitors
--                         entirely, instead of computing it and returning
--                         nothing. Same result, less work per request.
--
--   `(select auth.uid())` rather than bare `auth.uid()` — wrapping it in a
--                         SELECT lets Postgres evaluate the function ONCE per
--                         query instead of once per row. On a large table the
--                         difference is dramatic. This is Supabase's own
--                         documented recommendation.
-- -----------------------------------------------------------------------------

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using      ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- The handle_new_user trigger normally creates this row. This policy is a
-- repair path — it lets a signed-in user create their OWN profile row (and only
-- their own) if it is somehow missing. It opens nothing up: `id` must equal
-- their own uid.
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ( (select auth.uid()) = id );

-- Deliberately no DELETE policy. Profiles disappear via the cascade from
-- auth.users when the account itself is deleted.


-- -----------------------------------------------------------------------------
-- DOCTORS — everyone reads, nobody writes
-- -----------------------------------------------------------------------------
-- Includes `anon` so the public marketing pages can list providers without a
-- login. There is nothing private here — names and specialties are already
-- printed on the website.
-- -----------------------------------------------------------------------------

create policy "Anyone can view doctors"
  on public.doctors for select
  to anon, authenticated
  using ( true );

-- No INSERT/UPDATE/DELETE policies exist for this table. Under RLS, an action
-- with no policy is simply denied — so the API cannot write here at all.
-- Add or edit doctors from the SQL Editor.


-- -----------------------------------------------------------------------------
-- APPOINTMENTS — strictly your own
-- -----------------------------------------------------------------------------

create policy "Users can view own appointments"
  on public.appointments for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- with check on INSERT stops a patient booking an appointment "as" someone
-- else by sending a different user_id in the request body.
create policy "Users can book own appointments"
  on public.appointments for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can update own appointments"
  on public.appointments for update
  to authenticated
  using      ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- No DELETE policy: cancelling sets status = 'cancelled' instead, which keeps
-- the record for the clinic. See script 05 for what a patient may change.
