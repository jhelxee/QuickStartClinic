import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AppointmentPageBody } from "@/components/forms/appointment-page-body";
import { getDoctorPresence, getProfile } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Book an Appointment — QuickStart Clinic",
  description:
    "Request an appointment for developmental pediatrics, speech therapy, or occupational therapy at QuickStart Clinic.",
};

/**
 * Renders either the booking form (prefilled from the signed-in account's
 * profile) or the account gate, so the output depends on who is asking and must
 * not be cached.
 */
export const dynamic = "force-dynamic";

export default async function AppointmentPage() {
  // Prefills the guardian fields from the account holder's profile, so families
  // aren't retyping details we already hold. Null when logged out.
  const profile = await getProfile();
  const defaults = profile
    ? {
        guardianName: profile.legal_name,
        email: profile.email,
        phone: profile.phone,
      }
    : null;

  // Empty for logged-out visitors — doctor_presence() is granted to
  // `authenticated` only, so staff whereabouts stay off the public internet.
  const doctors = await getDoctorPresence();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      {/* Plain white, matching every other page shell. */}
      <main className="flex-1">
        <div className="container-clinic py-16 lg:py-20">
          <div className="max-w-2xl">
            <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
              Book an appointment
            </span>
            <h1 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
              Let&apos;s find your child&apos;s first appointment.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">
              Share a few details below and a care coordinator will confirm your
              visit and answer any questions before you arrive.
            </p>
          </div>

          <div className="mt-12">
            <AppointmentPageBody defaults={defaults} doctors={doctors} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
