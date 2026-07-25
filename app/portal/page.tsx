import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PortalBody } from "@/components/portal/portal-body";
import type { AppointmentRow, AppointmentStatus } from "@/components/portal/appointment-list";
import type { BookedSlot, TimetableEntry } from "@/components/portal/weekly-timetable";
import { getProfile, requireUser } from "@/lib/dal";
import { currentWeekColumns, toISODate } from "@/lib/schedule-data";
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

export default async function PortalPage() {
  // proxy.ts already redirected logged-out visitors, but this page checks for
  // itself rather than trusting that. Defense in depth is the whole point.
  await requireUser();
  const profile = await getProfile();

  const supabase = await createClient();
  const week = currentWeekColumns();
  const weekStart = week[0].date;
  const weekEnd = week[week.length - 1].date;
  const today = toISODate(new Date());

  // Note: no .eq("user_id", ...) anywhere below. The RLS policy on this table
  // already restricts every read to the caller's own rows, so forgetting the
  // filter is no longer a way to leak data.
  const { data: records } = await supabase
    .from("appointments")
    .select("id, service, scheduled_date, slot_time, status, patient_name, doctors(name)")
    .gte("scheduled_date", weekStart < today ? weekStart : today)
    .order("scheduled_date", { ascending: true })
    .order("slot_time", { ascending: true });

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

  // The list: everything from today forward, cancellations included so families
  // can see what happened to a booking.
  const upcoming: AppointmentRow[] = mine
    .filter((r) => r.scheduled_date >= today)
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

  // Occupied slots across the whole clinic. This goes through a security definer
  // function because RLS (correctly) hides other families' rows from a direct
  // query. It returns date, time, and doctor id only — no names, no notes.
  const { data: bookedRaw } = await supabase.rpc("get_booked_slots", {
    from_date: weekStart,
    to_date: weekEnd,
  });

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

      <main className="flex-1 bg-ice-50">
        <div className="container-clinic py-16 lg:py-20">
          <PortalBody
            firstName={firstName}
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
