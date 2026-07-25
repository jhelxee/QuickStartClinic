# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## This is not the Next.js (or React) you know

This project runs **Next.js 16.2.11** with **React 19.2.4**, both newer than
your training data. Breaking changes exist versus what you likely remember.
Before writing App Router, routing, caching, or auth code, check
`node_modules/next/dist/docs/` (organized as `01-app`, `02-pages`,
`03-architecture`, `04-community`). Two concrete traps already hit in this
codebase:

- **`middleware.ts` is gone.** The convention is now `proxy.ts`, exporting a
  function named `proxy` (not `middleware`). A copy-pasted `middleware.ts`
  from an older tutorial is silently ignored — sessions quietly stop
  refreshing. See `proxy.ts`.
- **`cookies()` is async.** Must be `await`ed (see `lib/supabase/server.ts`).

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config, eslint-config-next)
```

There is no test suite/framework configured in this repo (no `test` script,
no Jest/Vitest/Playwright dependency). Type-check with `npx tsc --noEmit`.
Do not run `npm run build` while the dev server is already running in this
directory — it's OneDrive-synced and concurrent builds can corrupt
`.next`/`tsconfig.tsbuildinfo`. Use `tsc --noEmit` / `eslint` instead to
check work while dev is live.

Supabase has no CLI/local setup in this repo — the database is a hosted
Supabase project, and schema changes are plain `.sql` files under
`supabase/migrations/`, applied by hand through the dashboard's SQL Editor in
numeric order. See `docs/supabase-setup.md` for the full walkthrough
(schema diagram, RLS verification checklist, role assignment, and the
reasoning behind each migration).

## Architecture

**QuickStart Clinic** — a pediatric clinic marketing site + patient portal +
staff/admin dashboard, on Next.js App Router + Supabase (Postgres, Auth,
RLS).

### Auth & authorization — layered, not single-point

Three independent layers each enforce access, and none alone is sufficient:

1. **`proxy.ts`** (not `middleware.ts` — see above) — optimistic,
   cookie-refresh + redirect-before-render for `/portal` and `/admin`. Reads
   the session only; no DB work (proxy runs on every request/prefetch).
   Explicitly skips redirecting when a request carries a `Next-Action`
   header, or the login POST's own redirect would break the Server Action
   response.
2. **`lib/dal.ts`** — the actual Data Access Layer and the one place the app
   asks "who is logged in / what role". `getUser()` (never `getSession()` —
   unverified cookie) is wrapped in React's `cache()` to dedupe per render.
   `requireUser()`, `requireStaff()`, `requireAdmin()` redirect on failure.
   Every Server Action and private page calls one of these itself — `proxy.ts`
   redirecting is a convenience, not a control, because Server Actions are
   reachable via direct POST.
3. **Postgres RLS + triggers** (`supabase/migrations/04_rls_policies.sql`,
   `05_status_guard.sql`) — the real boundary. RLS restricts which *rows* a
   query can touch; it cannot restrict which *columns/values* a row is
   updated to. That's what the `guard_appointment_update` and
   `guard_profile_update` triggers are for (e.g. stops a patient
   `PATCH`-ing their own appointment straight to `approved`, or their own
   profile's `role` to `admin`).

Four roles (`lib/dal.ts` `Role` type): `client` (own portal only), `staff`
and `doctor` (clinic-wide view via `/admin`, "doctor" also drives the
in-clinic presence indicator), `admin` (`/admin` + master data, no client
portal). Roles are assigned only via the SQL Editor directly — there is
intentionally no in-app UI path that can grant a role, since any such
endpoint would have to guard against self-escalation on top of everything
else. `landingPathFor(role)` decides `/portal` vs `/admin` right after login.

When adding a column that grants privilege, ask who can write to it — a
policy safe today can become a privilege-escalation hole the day a new
column is added to the table it governs (see `docs/supabase-setup.md` for
the worked example).

### Data flow conventions

- **snake_case in Postgres, camelCase in TypeScript**, mapped once at the
  server-action boundary (`app/actions/*.ts`) — not scattered across
  components.
- **Server Actions re-validate everything.** They're public POST endpoints
  callable directly, bypassing any form. Each one re-runs the Zod schema
  from `lib/validation.ts` and takes identity (`user_id`) from the verified
  session, never from caller-supplied data.
- **Appointment time** has one owner: `lib/slots.ts` converts between the UI
  label (`"9:00 AM"`) and the DB value (`"09:00"`). The nine slots there must
  stay in sync with the `CHECK` constraint on `appointments.slot_time`
  (`supabase/migrations/01_tables.sql`). Don't reintroduce a second
  label/value representation elsewhere.
- **Queries select only the columns they render** and lean on RLS instead of
  re-adding `.eq("user_id", ...)` filters by hand where RLS already scopes
  the rows — but re-check that assumption whenever a table gets a new
  policy (see `getProfile()` in `lib/dal.ts` for a case where a widened
  policy silently changed a query's result shape from one row to many).
- **`SECURITY DEFINER` Postgres functions are a deliberate RLS bypass.**
  `doctor_presence()` / `get_booked_slots()` are the only ones; they return
  narrow, non-identifying columns on purpose. Don't widen what they select.
- Status lifecycle: `pending → approved → completed`, with `cancelled`
  reachable from `pending`/`approved`. Stored as a lowercase-slug `CHECK`
  constraint, not a Postgres `enum`, so adding a value is a one-line
  `ALTER`. Prefer the soft-close `cancelled` over `DELETE`.

### Directory map (non-obvious parts only)

- `app/actions/` — Server Actions (`"use server"`), grouped by domain
  (`appointments.ts`, `admin.ts`, `master-data.ts`, `session.ts`).
- `lib/dal.ts` — auth/role gate, described above.
- `lib/supabase/{client,server,env}.ts` — `client.ts` for `"use client"`
  components, `server.ts` for Server Components/Actions. `env.ts` requires
  `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` to be referenced as literal
  `process.env.NEXT_PUBLIC_*` accesses (Next inlines by exact text match at
  build time — a dynamic `process.env[name]` lookup breaks in the browser
  bundle) and fails loudly (with setup instructions) if they're missing or
  still the placeholder values from `.env.local.example`.
- `lib/auth-context.tsx` — client-side session mirror for rendering only
  (header state, login/logout UI). Never a security boundary by itself.
- `components/presence/` — doctor "in clinic" live-status UI, backed by the
  `doctor_presence()` RPC and an `end_presence` call on logout.
- `supabase/migrations/*.sql` — hand-applied via the Supabase SQL Editor, in
  numeric order; not run through a migration CLI. Each file's comments
  explain *why*, not just what — read them before changing schema.
- `docs/supabase-setup.md` — canonical reference for the schema, RLS design,
  and role system; consult it before touching auth/appointments/roles.
