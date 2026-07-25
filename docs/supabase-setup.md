# Supabase setup — step by step

A beginner-friendly walkthrough for getting the database and authentication
running. Follow it in order; each step assumes the previous one worked.

---

## What you're building

Three tables and one function:

```
auth.users                    public.profiles
┌───────────────────┐         ┌──────────────────────┐
│ id (uuid)  ───────┼─────────┤ id (uuid) PK & FK    │
│ email             │ 1  ── 1 │ legal_name           │
│ encrypted_password│         │ date_of_birth        │
│ ...Supabase-owned │         │ sex, residence, phone│
└─────────┬─────────┘         └──────────────────────┘
          │
          │ 1 ── many
          ▼
   public.appointments ──── many ── 1 ──▶ public.doctors
   ┌────────────────────┐              ┌──────────────┐
   │ user_id    (FK)    │              │ name         │
   │ doctor_id  (FK)  ──┼──────────────┤ specialty    │
   │ service            │              │ service_slug │
   │ patient_name       │              └──────────────┘
   │ scheduled_date     │
   │ slot_time          │
   │ status             │
   └────────────────────┘
```

**Why `profiles` instead of just using `auth.users`?** `auth.users` belongs to
Supabase. You cannot add columns to it (no `residence`, no `sex`, no `phone`),
and it isn't exposed through the REST API, so you can't query it from your app.
The standard pattern is your own table in the `public` schema whose primary key
is also a foreign key to `auth.users.id`.

**Where's the password?** In `auth.users.encrypted_password`, hashed, managed by
Supabase. It never touches `profiles`. Never add a password column there.

---

## 1. Create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick a region near your users.
3. Save the database password somewhere safe — it's shown once, and it is *not*
   the same thing as your API keys.

Wait for provisioning to finish (a minute or two).

---

## 2. Run the SQL

Left sidebar → **SQL Editor** → **New query**. Open each file from
[supabase/migrations/](../supabase/migrations/), paste the whole thing, click
**Run**, and check the result before moving to the next.

| # | File | What it does | Expected result |
|---|---|---|---|
| 1 | `01_tables.sql` | Creates the three tables, seeds 3 doctors, adds indexes | Success. No rows returned. |
| 2 | `02_profile_trigger.sql` | Auto-creates the profile row on signup | Success. No rows returned. |
| 3 | `03_updated_at.sql` | Keeps `updated_at` accurate | Success. No rows returned. |
| 4 | `04_rls_policies.sql` | **Turns on Row Level Security** | Success. No rows returned. |
| 5 | `05_status_guard.sql` | Stops patients self-approving appointments | Success. No rows returned. |
| 6 | `06_availability.sql` | Privacy-safe "which slots are taken" lookup | Success. No rows returned. |
| 7 | `07_verify.sql` | Checks your work — **read the output** | See below. |
| 8 | `08_staff_role.sql` | Staff role + appointment approval | Success. No rows returned. |

Every file has comments explaining *why*, not just what. Script 4 is the one
that actually protects patient data — read it.

---

## 3. Verify (don't skip this)

Run `07_verify.sql` and actually read what comes back:

- **Check 1** — three tables, `rowsecurity = true` for all of them. A `false`
  means that table is readable by anyone holding your anon key.
- **Check 2** — eight policies. Look at the `qual` column: that's the real
  filter Postgres applies.
- **Check 3** — the important one. It impersonates a logged-out visitor and
  tries to read appointments. **It must return zero rows.** If it returns data,
  stop and fix RLS before writing any app code.
- **Check 4** — an anonymous user calling `get_booked_slots` must get
  "permission denied". An error here is the *pass* condition.
- **Check 5** — three doctors, with `service_slug` values matching
  `serviceOptions` in [lib/validation.ts](../lib/validation.ts). A typo here
  makes bookings fail with "That service isn't available right now."

Then open **Table Editor** in the sidebar. Each table should show an
"RLS enabled" badge. If any shows **"RLS disabled"** in red, that table is
world-readable — go back to script 4.

---

## 4. Configure authentication

Sidebar → **Authentication → Sign In / Providers**.

Email is enabled by default. For local development, turn **"Confirm email"
OFF** so you can test without checking your inbox each time.

Turn it back on before anyone real uses this. The app handles both cases — with
confirmation on, registration sends you to the login page with a "check your
email" message instead of straight into the portal.

---

## 5. Add your keys

Sidebar → **Project Settings → API**. Copy the **Project URL** and the
**anon / publishable** key.

Create `.env.local` in the project root (there's a template at
`.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server after adding these — Next only reads env files at startup.

> The same page shows a **service_role** key. It bypasses Row Level Security
> completely. Never put it in a `NEXT_PUBLIC_` variable, never import it into a
> client component. This app doesn't need it.

---

## 6. Run it

```bash
npm run dev
```

Then work through this, in order:

1. **Register** at `/register`. Fill in every field.
2. In the SQL Editor: `select * from public.profiles;` — one row, all fields
   populated, no password column anywhere.
3. Cross-check the link:
   ```sql
   select u.id, u.email, p.legal_name, p.phone
   from auth.users u join public.profiles p on p.id = u.id;
   ```
4. **Log out, then log back in with a deliberately wrong password.** It must
   fail. (Before this change, any password was accepted.)
5. **Book an appointment** at `/appointment`. Then:
   `select * from public.appointments;` — confirm `patient_name`,
   `guardian_name`, `notes`, and `contact_phone` are all saved, and that
   `doctor_id` matches the doctor for that service.
6. **Check isolation.** Register a second account in a private window, book
   something, then log back in as the first. Each portal shows only its own
   appointments.
7. **Cancel** an appointment from the portal. Status becomes "Cancelled" and the
   slot frees up in the timetable.
8. **Try to break it.** With a logged-in session, `PATCH` an appointment to
   `{"status":"approved"}` directly against the REST API. The trigger must
   reject it. `{"status":"cancelled"}` must succeed.

---

## Roles

Run [08_staff_role.sql](../supabase/migrations/08_staff_role.sql) then
[09_roles_and_bookings.sql](../supabase/migrations/09_roles_and_bookings.sql),
which replaces the original `is_staff` boolean with a three-value role.

| Role | Lands on | Sees | Own portal |
|---|---|---|---|
| `client` | `/portal` | Only their own appointments | Yes |
| `staff` | `/admin` | Every booking, with patient names | Yes |
| `admin` | `/admin` | Every booking, with patient names | **No** |

Assign roles **from the SQL Editor** — the only way, by design:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
update public.profiles set role = 'staff' where email = 'coordinator@example.com';
```

Sign out and back in. Staff and admin land straight on `/admin` with no button
click; clients keep the family portal untouched.

### Why the API can't grant a role

Script 04's "Users can update own profile" policy lets a signed-in user update
their own row — and it doesn't care *which* columns change. The moment a
privilege column exists, any client could send:

```
PATCH /rest/v1/profiles?id=eq.<their-own-id>
{ "role": "admin" }
```

and hand themselves every family's records. **RLS cannot stop this** — the row
genuinely is theirs. It's the same shape of hole as the appointment status
problem, and it needs the same fix: the `guard_profile_update` trigger, which
compares `OLD` to `NEW` and rejects any change to `role`.

**The lesson worth carrying:** when you add a column that grants privilege, ask
who can write to it. A policy that was safe yesterday becomes a
privilege-escalation bug the day you add a new column to the table it governs.

That's the pattern worth carrying with you: **the moment you add a column that
grants privilege, ask who can write to it.** A policy that was safe yesterday
can become a privilege-escalation bug the day you add a new column to the table
it governs.

### What staff can and can't see

Staff get two extra policies on `appointments` (view all, update all), and
nothing else. There is deliberately **no** staff policy on `profiles` — every
appointment row already carries `guardian_name`, `contact_phone`, and
`contact_email`, so the approval screen has what it needs without exposing every
family's date of birth and home address. Least privilege.

---

## How the app connects to it

| File | Role |
|---|---|
| [lib/supabase/client.ts](../lib/supabase/client.ts) | Client for `"use client"` components |
| [lib/supabase/server.ts](../lib/supabase/server.ts) | Client for Server Components and Actions (note: `cookies()` is async in Next 16) |
| [proxy.ts](../proxy.ts) | Refreshes the session, redirects logged-out users away from `/portal` |
| [lib/dal.ts](../lib/dal.ts) | `getUser()` / `requireUser()` / `getProfile()` — the one place the app asks who's logged in |
| [app/actions/appointments.ts](../app/actions/appointments.ts) | `createAppointment`, `cancelAppointment` |
| [lib/slots.ts](../lib/slots.ts) | The single place `"9:00 AM"` ↔ `09:00` is converted |

### A Next 16 trap worth knowing

Nearly every Supabase + Next.js tutorial online tells you to create
`middleware.ts`. **In Next 16 that file convention is deprecated and renamed to
`proxy.ts`**, with the exported function renamed from `middleware` to `proxy`.
A copy-pasted `middleware.ts` is silently ignored — Next never picks it up, so
sessions quietly stop refreshing. `cookies()` is also async now and must be
awaited.

### The pattern to internalize

Look at how the portal fetches appointments
([app/portal/page.tsx](../app/portal/page.tsx)):

```ts
const { data } = await supabase
  .from("appointments")
  .select("id, service, scheduled_date, slot_time, status, patient_name, doctors(name)")
  .gte("scheduled_date", weekStart);
```

There is no `.eq("user_id", user.id)`. RLS already applied it, inside Postgres,
before any row was returned. That's the point of doing it in the database:
forgetting the filter is no longer a data leak.

---

## Best practices in plain terms

**Keeping patient data private**

- RLS on *every* table in `public`, no exceptions. A table without it is
  readable by anyone with the anon key — which is public by design.
- The anon key is not your security. RLS is.
- `service_role` bypasses RLS. Server-side only, never `NEXT_PUBLIC_`.
- Select only the columns you render. The timetable needs date/time — it does
  not need `notes` or `contact_phone`, so it doesn't ask for them.
- `SECURITY DEFINER` functions are a deliberate hole in RLS.
  `get_booked_slots` is the only one here, and it returns three
  non-identifying columns on purpose. Never add patient fields to it.
- Every Server Action calls `requireUser()` first and re-validates with Zod.
  Client-side validation is a courtesy to the user, not a control.

**Status values**

`pending → approved → completed`, with `cancelled` reachable from the first two.

- Stored as lowercase slugs with a `CHECK` constraint rather than a Postgres
  `enum` — adding a value later is a one-line `ALTER` instead of a migration.
- `pending` is the default, so a new booking is never statusless.
- Patients can only ever reach `cancelled`. That's enforced by the
  `guard_appointment_update` trigger, because **RLS can only express which
  *rows* you may touch, never which *changes* are legal.** Without the trigger,
  a patient could `PATCH` their own booking to `approved` and RLS would happily
  allow it.

**General**

- snake_case in Postgres, camelCase in TypeScript, mapped once at the
  server-action boundary.
- Index your foreign keys and anything you filter on.
- Prefer a soft close (`cancelled`) over `DELETE` so the clinic keeps the record.
