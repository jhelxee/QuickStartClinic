import { z } from "zod";

import { isSlotLabel, slotLabels } from "@/lib/slots";

const PHONE_ALLOWED_CHARS = /^[0-9+()\-.\s]+$/;

const phoneField = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine((value) => PHONE_ALLOWED_CHARS.test(value), "Enter a valid phone number")
  .refine((value) => {
    const digitCount = value.replace(/\D/g, "").length;
    return digitCount >= 7 && digitCount <= 15;
  }, "Enter a valid phone number");

const emailField = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .email("Enter a valid email address");

function isTwoWordName(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length >= 2;
}

function toDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function yearsSince(date: Date) {
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export const sexOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const registerSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(2, "Enter your full legal name")
    .refine(isTwoWordName, "Enter your first and last name"),
  email: emailField,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  confirmPassword: z.string().min(1, "Confirm your password"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => toDate(value) !== null, "Enter a valid date")
    .refine((value) => {
      const date = toDate(value);
      return date ? date.getTime() <= Date.now() : false;
    }, "Date of birth cannot be in the future")
    .refine((value) => {
      const date = toDate(value);
      return date ? yearsSince(date) >= 18 : false;
    }, "You must be 18 or older to register an account"),
  residence: z.string().trim().min(3, "Enter your city and state, or full address"),
  sex: z.enum(["female", "male", "prefer_not_to_say"], {
    message: "Please select an option",
  }),
  phone: phoneField,
});

export type RegisterValues = z.infer<typeof registerSchema>;

/**
 * Cross-field check kept outside the schema: Zod v4 skips a schema's own
 * .superRefine when any sibling field already has an issue, which would hide
 * "passwords don't match" until every other field was already valid. Running
 * it as a separate, always-on check (see register-form.tsx) keeps it visible
 * alongside any other field errors.
 */
export function checkPasswordsMatch(values: {
  password: string;
  confirmPassword: string;
}): string | null {
  if (values.password !== values.confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Appointment booking
// ---------------------------------------------------------------------------

export const serviceOptions = [
  { value: "developmental-pediatrician", label: "Developmental Pediatrician" },
  { value: "speech-therapy", label: "Speech Therapy" },
  { value: "occupational-therapy", label: "Occupational Therapy" },
] as const;

/**
 * Turns the slug stored in the database into the label the UI shows.
 * "speech-therapy" -> "Speech Therapy".
 */
export function serviceLabel(slug: string): string {
  return serviceOptions.find((s) => s.value === slug)?.label ?? slug;
}

/**
 * Selectable appointment times. Derived from lib/slots.ts rather than written
 * out again here — that module owns the label/value pairing and keeps it in
 * sync with the CHECK constraint on appointments.slot_time.
 */
export const timeSlots = slotLabels;

export const appointmentSchema = z.object({
  service: z.enum(
    ["developmental-pediatrician", "speech-therapy", "occupational-therapy"],
    { message: "Select a service" }
  ),
  preferredDate: z
    .string()
    .min(1, "Select a preferred date")
    .refine((value) => toDate(value) !== null, "Enter a valid date")
    .refine((value) => {
      const date = toDate(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date ? date.getTime() >= today.getTime() : false;
    }, "Preferred date can't be in the past"),
  preferredTime: z
    .string()
    .min(1, "Select a preferred time")
    // The `: boolean` annotation is load-bearing. isSlotLabel is a type guard,
    // and TypeScript 5.5+ also infers type predicates for arrow functions that
    // just forward to one — either way .refine() would narrow preferredTime to
    // the literal union of the nine slots. That narrowing propagates through
    // react-hook-form and makes the empty-string default value a type error.
    // Annotating the return type keeps this a plain boolean check.
    .refine((value): boolean => isSlotLabel(value), "Select a time we offer"),
  guardianName: z
    .string()
    .trim()
    .min(2, "Enter the parent or guardian's full name")
    .refine(isTwoWordName, "Enter a first and last name"),
  patientName: z
    .string()
    .trim()
    .min(2, "Enter the patient's full name")
    .refine(isTwoWordName, "Enter a first and last name"),
  patientInfoType: z.enum(["dob", "age"]),
  patientDob: z.string().optional(),
  patientAge: z.string().optional(),
  phone: phoneField,
  email: emailField,
  notes: z.string().trim().max(600, "Keep notes under 600 characters").optional(),
});

export type AppointmentValues = z.infer<typeof appointmentSchema>;

// ---------------------------------------------------------------------------
// Staff-recorded booking (phone / walk-in)
// ---------------------------------------------------------------------------

/**
 * Same details a family would give online, plus an optional account to attach
 * the booking to.
 *
 * `familyEmail` is looked up with find_family_by_email. Left blank, the
 * appointment is stored with no owner — visible to staff only, which is the
 * right outcome for a caller who has never used the site.
 */
export const staffAppointmentSchema = appointmentSchema.extend({
  familyEmail: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Enter a valid email address, or leave this blank"
    ),
});

export type StaffAppointmentValues = z.infer<typeof staffAppointmentSchema>;

/**
 * Cross-field check kept outside the schema for the same reason as
 * checkPasswordsMatch above — see appointment-form.tsx.
 */
export function checkPatientInfo(values: {
  patientInfoType: "dob" | "age";
  patientDob?: string;
  patientAge?: string;
}): { path: "patientDob" | "patientAge"; message: string } | null {
  if (values.patientInfoType === "dob") {
    const date = values.patientDob ? toDate(values.patientDob) : null;
    if (!values.patientDob) {
      return { path: "patientDob", message: "Patient date of birth is required" };
    }
    if (!date) {
      return { path: "patientDob", message: "Enter a valid date" };
    }
    if (date.getTime() > Date.now()) {
      return { path: "patientDob", message: "Date of birth cannot be in the future" };
    }
    return null;
  }

  const age = Number(values.patientAge);
  if (!values.patientAge || Number.isNaN(age)) {
    return { path: "patientAge", message: "Patient age is required" };
  }
  if (age < 0 || age > 17) {
    return { path: "patientAge", message: "Enter an age between 0 and 17" };
  }
  return null;
}
