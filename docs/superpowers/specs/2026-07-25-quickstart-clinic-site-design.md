# QuickStart Clinic Website — Design Spec

Date: 2026-07-25

## Goal

A premium, implementation-ready marketing + auth + booking website for QuickStart Clinic (Developmental Pediatrician, Speech Therapy, Occupational Therapy), built with Next.js 14 App Router, TypeScript, Tailwind CSS, and shadcn/ui. Front-end only — no backend/auth/database. Forms validate client-side and simulate submission.

## Creative Direction

"Calm Systematic": grid-driven, editorial, not a generic rounded-bubble clinic template. Serif display type (Fraunces) paired with a humanist grotesk sans (Plus Jakarta Sans) for body/UI. Moderate corner radii, Lucide line icons at consistent stroke weight. The logo's cloud-mark motif is reused as a soft abstract blob shape for section dividers/backgrounds instead of stock iconography or clip-art. Any photography gets a consistent soft-edge blue-duotone treatment. Parent-friendly, not childish: no bright primary-color playfulness, no comic-style icons, no stock "smiling kid" filler photos as crutches.

## Color Palette (derived from brand logo: blue cloud/flower mark + "QuickStart / CLINIC" wordmark)

| Token | Hex | Use |
|---|---|---|
| brand-blue-600 | #1C7FE0 | Primary actions, links, focus rings |
| brand-blue-700 | #0F5FB8 | Hover/active states |
| navy-900 | #0B2A4A | Headlines on light backgrounds, footer background |
| ice-50 | #F4F9FB | Alternate section backgrounds |
| slate-700 | #33404D | Body text |
| slate-400 | #8A97A3 | Muted text, placeholders |
| white | #FFFFFF | Base background, cards |
| success-500 | #2E9E6B | Confirmation states |

## Typography

- Display/Headlines: Fraunces (variable serif), via next/font/google
- Body/UI: Plus Jakarta Sans, via next/font/google
- No external font CDNs

## Pages

- `/` — Landing: sticky header, hero, services (3 cards), trust-building section, testimonials, FAQ, footer
- `/login` — Login form
- `/register` — Registration form (Legal Name, Email, Password, Confirm Password w/ match validation, DOB, Residence, Sex, Phone)
- `/appointment` — Appointment booking form (Service type, Preferred date, Preferred time, Parent/guardian full name, Patient full name, Patient DOB or age, Phone, Email, Notes/concerns)

## Folder Structure

```
app/
  layout.tsx, page.tsx, globals.css
  login/page.tsx
  register/page.tsx
  appointment/page.tsx
components/
  layout/ (site-header, site-footer, logo, mobile-nav)
  marketing/ (hero, services-section, trust-section, testimonials-section, faq-section, cta-band)
  forms/ (login-form, register-form, appointment-form)
  ui/ (shadcn primitives)
lib/ (validation.ts — Zod schemas, utils.ts)
public/logo.png
```

## Validation

react-hook-form + Zod resolvers.
- Register: legalName (min 2 words feel, min length), email (valid email), password (min 8, upper/lower/number), confirmPassword (refine equals password), dob (valid past date, implies age reasonability), residence (min length), sex (enum: female/male/prefer not to say), phone (regex).
- Appointment: service (enum of 3 services), preferredDate (future date), preferredTime (required), guardianName, patientName, patientDobOrAge, phone, email, notes (optional, max length).

## Scope Boundaries

- No backend, no real authentication, no database, no payment.
- No CMS — copy is hardcoded placeholder content written for this brand (no lorem ipsum, no generic filler).
- Scaffolded, installed, and run locally (npm run dev) as part of delivery.
