# Patient Portal, Booking Gate & Privacy — Design Spec

Date: 2026-07-25 (addendum to 2026-07-25-quickstart-clinic-site-design.md)

## Goal

Extend the front-end-only QuickStart Clinic site with: public office hours/doctor schedule, a clinic map, registration-gated booking, a post-login patient portal with a weekly timetable calendar, and privacy-conscious display of appointment slots (other patients' bookings show as anonymous "Occupied," never by name).

## Scope Decision

Still front-end only — no real backend/database. A simulated session (React Context backed by localStorage) stands in for authentication. This demonstrates the UX and privacy-conscious information architecture faithfully, but is not real security (all data lives in client JS/localStorage). Explicitly accepted trade-off per user direction.

## Architecture

- `AuthProvider` (React Context + localStorage): holds `{ name, email } | null`. Exposes `login()`, `logout()`, `isAuthenticated`. Wraps the app in `app/layout.tsx`.
- `lib/appointments-store.ts`: localStorage-backed list of the current patient's own booked appointments (`{ id, service, date, time }`). Populated when the appointment form is submitted while authenticated.
- Mock "other patients" schedule: a fixed, hardcoded array of occupied slots with **no patient-identifying fields at all** — only day/time/service — enforced by the data shape itself, not just the UI, so there's nothing to leak.

## Pages & Components

1. **Hero (`components/marketing/hero.tsx`)** — floating mockup cards replaced: "Office Hours" (weekly hours table) and "Doctor's Schedule" (doctor → days grid). Public, no auth.
2. **Find Us section (`components/marketing/find-us-section.tsx`)** — new landing page section: stylized illustrated SVG map (not a real geocoded embed, since the clinic address is fictional), address, hours, directions link.
3. **Appointment gate (`components/forms/appointment-gate.tsx`)** — shown on `/appointment` when logged out: message + Log In / Create Account buttons. Logged-in visitors see the existing `AppointmentForm` (now prefilled from session; on success, appends to `appointments-store` and redirects to `/portal`).
4. **Portal (`app/portal/page.tsx`, new)** — protected client route: redirects to `/login` if unauthenticated. Shows welcome header, `WeeklyTimetable` component, "Schedule Appointment" button → `/appointment`.
5. **`WeeklyTimetable` (`components/portal/weekly-timetable.tsx`)** — 7-day × time-slot grid. Each cell: Available (neutral) / Occupied (muted, anonymous, no tooltip data beyond "Occupied") / Yours (highlighted, shows service + time — sourced only from `appointments-store`, i.e., only the logged-in patient's own data).
6. **Header (`components/layout/site-header.tsx`)** — auth-aware: "My Portal" + "Log out" when signed in, "Log In" + "Book an Appointment" when signed out.
7. **Register/Login forms** — on success, call `login()` from `AuthProvider` and redirect to `/portal` (previously `/` and `/login` respectively).

## Privacy Enforcement (UI-level, given the mock-data constraint)

- The "other patients" mock dataset structurally contains no name/email/identifying field — so there is nothing for the UI to accidentally render, even by mistake.
- The only slot data with identifying detail is the current session's own `appointments-store` entries, scoped to `localStorage` under a session-specific state, read only by the `WeeklyTimetable` component to render the "Yours" cells.

## Out of Scope

- Real authentication, database, or server-side enforcement.
- Real geocoded map (address is fictional).
- Multi-day/multi-week navigation in the timetable (single current-week view only).
