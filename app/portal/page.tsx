import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PortalBody } from "@/components/portal/portal-body";
import type { AppointmentRow, AppointmentStatus } from "@/components/portal/appointment-list";
import type { BookedSlot, TimetableEntry } from "@/components/portal/weekly-timetable";
import { redirect } from "next/navigation";

import { getDoctorPresence, getProfile, isClinicSide, requireUser } from "@/lib/dal";
import { rollingColumns, toISODate } from "@/lib/schedule-data";
import { slotTimeToLabel } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";
import { serviceLabel } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Family Portal — QuickStart Clinic",
  description: "View the clinic's weekly schedule and manage your appointments.",
};

/**
 * Never prerender this page. Everything on it is specific to one signed-in
 * family, so a cached copy would either be wrong or would serve one family's
 * schedule to another.
 *
 * Reading the session cookie already forces dynamic rendering at runtime, but
 * being explicit means `npm run build` doesn't try to prerender a page that
 * has no meaningful logged-out version.
 */
export const dynamic = "force-dynamic";

/** Shape PostgREST returns for the appointments query below. */
interface AppointmentRecord {
  id: string;
  service: string;
  scheduled_date: string;
  slot_time: string;
  status: AppointmentStatus;
  patient_name: string;
  // A many-to-one embed. PostgREST has returned this as an object in some
  // versions and a single-element array in others, so handle both.
  doctors: { name: string } | { name: string }[] | null;
}

function doctorName(record: AppointmentRecord): string {
  const { doctors } = record;
  if (!doctors) return "To be assigned";
  return Array.isArray(doctors) ? (doctors[0]?.name ?? "To be assigned") : doctors.name;
}

export default async function PortalPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // proxy.ts already redirected logged-out visitors, but this page checks for
  // itself rather than trusting that. Defense in depth is the whole point.
  //
  // requireUser() and getProfile() each start with getUser() — but getUser()
  // is wrapped in React's cache(), so running them concurrently still costs
  // only one real Supabase round trip, not two.
  const [user, profile, { family }] = await Promise.all([
    requireUser(),
    getProfile(),
    searchParams,
  ]);

  const clinicSide = profile ? isClinicSide(profile.role) : false;

  // Clinic-side roles get the Staff/Administrator UI by default — no manual
  // switching, however they arrive: login, a bookmark, a stale link, or
  // proxy.ts bouncing them off a protected route.
  //
  // ?family=1 is the deliberate exception. Staff and doctors are often parents
  // at this clinic themselves, and a blanket redirect left them no way to see
  // their own children's appointments. Getting here takes an explicit click on
  // "My family" in the Staff UI, so the default never changes and nobody lands
  // on the client view by accident.
  const familyView = family === "1";
  if (clinicSide && !familyView) redirect("/admin");

  const supabase = await createClient();
  // A rolling window starting today, not a Mon–Sat calendar week. On a Saturday
  // the old grid showed a week that had already finished, so an appointment two
  // days away had no column to appear in.
  const week = rollingColumns();
  const weekStart = week[0].date;
  const weekEnd = week[week.length - 1].date;
  const now = new Date();
  const today = toISODate(now);

  // Finished and past appointments stay visible for a week before dropping off,
  // so a family can still see the visit they had on Tuesday.
  //
  // Built from date parts rather than subtracting milliseconds: arithmetic on
  // the day component rolls months and years correctly and is unaffected by
  // daylight-saving shifts, where a fixed 7 * 24h can land on the wrong date.
  const RETENTION_DAYS = 7;
  const retentionStart = toISODate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - RETENTION_DAYS)
  );
  const fetchFrom = retentionStart < weekStart ? retentionStart : weekStart;

  // The .eq("user_id", user.id) is REQUIRED, and this file used to claim it
  // wasn't. When only "Users can view own appointments" existed, RLS could not
  // return anyone else's row and the filter was genuinely redundant.
  //
  // Script 08 then added "Staff can view all appointments". Permissive policies
  // are OR'd, so for a staff, doctor, or admin account this same query started
  // returning EVERY family's bookings — and the portal listed them all under
  // "Your appointments". A real privacy leak, produced by adding a policy
  // somewhere else entirely.
  //
  // RLS is a floor, not a substitute for asking the right question. Scope the
  // query to what this screen is supposed to show, and let RLS be the backstop.
  //
  // This, the booked-slots RPC below, and the doctor presence RPC don't depend
  // on each other's results — they used to run one after another, turning three
  // round trips to Supabase into three round trips' worth of wait time. Firing
  // them together costs roughly what the slowest single one costs.
  const [{ data: records }, { data: bookedRaw }, doctors] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, service, scheduled_date, slot_time, status, patient_name, doctors(name)")
      .eq("user_id", user.id)
      .gte("scheduled_date", fetchFrom)
      .order("scheduled_date", { ascending: true })
      .order("slot_time", { ascending: true }),
    // Occupied slots across the whole clinic. This goes through a security
    // definer function because RLS (correctly) hides other families' rows from
    // a direct query. It returns date, time, and doctor id only — no names, no
    // notes.
    supabase.rpc("get_booked_slots", { from_date: weekStart, to_date: weekEnd }),
    getDoctorPresence(),
  ]);

  const mine = (records ?? []) as unknown as AppointmentRecord[];

  // The grid: this week only, and cancelled bookings shouldn't hold a slot.
  const timetableEntries: TimetableEntry[] = mine
    .filter(
      (r) =>
        r.scheduled_date >= weekStart &&
        r.scheduled_date <= weekEnd &&
        r.status !== "cancelled"
    )
    .flatMap((r) => {
      const time = slotTimeToLabel(r.slot_time);
      if (!time) return [];
      return [
        {
          id: r.id,
          date: r.scheduled_date,
          time,
          serviceLabel: serviceLabel(r.service),
        },
      ];
    });

  // The list: everything from a week ago forward. Completed and cancelled
  // visits stay on the page for RETENTION_DAYS rather than vanishing the moment
  // they're done, then age out on their own.
  const listed: AppointmentRow[] = mine
    .filter((r) => r.scheduled_date >= retentionStart)
    .flatMap((r) => {
      const time = slotTimeToLabel(r.slot_time);
      if (!time) return [];
      return [
        {
          id: r.id,
          patientName: r.patient_name,
          serviceLabel: serviceLabel(r.service),
          doctorName: doctorName(r),
          date: r.scheduled_date,
          time,
          status: r.status,
        },
      ];
    });

  // Upcoming first (soonest at the top), then recent visits newest-first. Plain
  // chronological order would bury next week's appointment under last week's.
  const upcoming: AppointmentRow[] = [
    ...listed.filter((row) => row.date >= today),
    ...listed.filter((row) => row.date < today).reverse(),
  ];

  const bookedSlots: BookedSlot[] = (
    (bookedRaw ?? []) as { slot_date: string; booked_time: string }[]
  ).flatMap((slot) => {
    const time = slotTimeToLabel(slot.booked_time);
    return time ? [{ date: slot.slot_date, time }] : [];
  });

  const firstName = (profile?.legal_name ?? "there").split(" ")[0];

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      {/* brand-blue-50 — the same pale blue used as the accent token elsewhere
          in the design system, rather than a one-off colour. Cards keep their
          own white background and border, so they still read as distinct
          surfaces against it. */}
      <main className="flex-1 bg-brand-blue-50">
        <div className="container-clinic py-16 lg:py-20">
          <PortalBody
            today={today}
            firstName={firstName}
            showBackToStaff={clinicSide}
            doctors={doctors}
            week={week}
            timetableEntries={timetableEntries}
            bookedSlots={bookedSlots}
            upcoming={upcoming}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
