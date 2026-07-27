import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AdminBody, type StaffAppointmentRow } from "@/components/admin/admin-body";
import type { SpecialtyGroup, StaffSlotEntry } from "@/components/admin/staff-timetable";
import type { AppointmentStatus } from "@/components/portal/appointment-list";
import { PresenceHeartbeat } from "@/components/presence/presence-heartbeat";
import { getDoctorPresence, requireStaff } from "@/lib/dal";
import { rollingColumns, toISODate } from "@/lib/schedule-data";
import { slotTimeToLabel } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";
import { serviceLabel, serviceOptions } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Staff — QuickStart Clinic",
  description: "Confirm and manage appointment requests.",
  // Keep the staff area out of search results.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface StaffRecord {
  id: string;
  service: string;
  scheduled_date: string;
  slot_time: string;
  status: AppointmentStatus;
  patient_name: string;
  patient_dob: string | null;
  patient_age: number | null;
  guardian_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string | null;
  user_id: string | null;
  doctor_id: string;
  doctors: { name: string } | { name: string }[] | null;
}

function doctorName(record: StaffRecord): string {
  const { doctors } = record;
  if (!doctors) return "To be assigned";
  return Array.isArray(doctors) ? (doctors[0]?.name ?? "To be assigned") : doctors.name;
}

/** "Age 12" or "DOB 2014-04-09" — whichever the family provided. */
function patientDetail(record: StaffRecord): string {
  if (record.patient_age !== null) return `age ${record.patient_age}`;
  if (record.patient_dob) return `b. ${record.patient_dob}`;
  return "age not given";
}

export default async function AdminPage() {
  // Redirects non-staff to /portal. The RLS policies and the status trigger are
  // what actually enforce this — the guard just avoids rendering the page.
  const profile = await requireStaff();

  const supabase = await createClient();
  const now = new Date();
  const today = toISODate(now);
  const doctors = await getDoctorPresence();

  // Bounded on purpose — this used to fetch every appointment ever booked, on
  // every load, forever. Built from date parts rather than millisecond math,
  // same reasoning as app/portal/page.tsx's retention window: it stays
  // correct across month/year boundaries and daylight-saving shifts.
  const RETENTION_PAST_DAYS = 5;
  const RETENTION_FUTURE_DAYS = 10;
  const retentionStart = toISODate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - RETENTION_PAST_DAYS)
  );
  const retentionEnd = toISODate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + RETENTION_FUTURE_DAYS)
  );
  // "Past and closed" additionally caps at today+5 (tighter than the fetch
  // window, which extends to +10 for "Confirmed and upcoming"'s sake).
  const pastCutoff = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5));

  // No .eq() filter: the "Staff can view all appointments" policy widens what
  // this same query returns. Run it as a patient and you'd get only your own
  // rows back — the SQL doesn't change, the policy does.
  //
  // The unread-message count is independent of the appointments query, so it
  // runs alongside it rather than after it — same reasoning as the parallel
  // fetch in app/portal/page.tsx.
  //
  // pending is fetched unconditionally, outside the date window — it's an
  // action queue, not history, and a family can request a slot weeks out.
  // Hiding a pending request behind a retention window would mean staff never
  // see it needing confirmation. Older history beyond this window is what
  // /admin/records is for.
  const [{ data }, { count: newInquiriesCount }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, service, scheduled_date, slot_time, status, patient_name, patient_dob, patient_age, guardian_name, contact_phone, contact_email, notes, user_id, doctor_id, doctors(name)"
      )
      .or(
        `status.eq.pending,and(scheduled_date.gte.${retentionStart},scheduled_date.lte.${retentionEnd})`
      )
      .order("scheduled_date", { ascending: true })
      .order("slot_time", { ascending: true }),
    supabase
      .from("contact_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  const records = (data ?? []) as unknown as StaffRecord[];
  const week = rollingColumns();
  const weekStart = week[0].date;
  const weekEnd = week[week.length - 1].date;

  // The week grid, with names — staff are authorised to see who is booked.
  // Kept with doctorId through this intermediate step so it can be filtered
  // into each doctor's own row below; StaffSlotEntry itself doesn't carry
  // doctorId, since which doctor an entry belongs to is implied by which
  // row it renders under once grouped.
  const slotBuilds: (StaffSlotEntry & { doctorId: string })[] = records.flatMap(
    (record) => {
      if (record.scheduled_date < weekStart || record.scheduled_date > weekEnd) {
        return [];
      }
      const time = slotTimeToLabel(record.slot_time);
      if (!time) return [];
      return [
        {
          id: record.id,
          date: record.scheduled_date,
          time,
          patientName: record.patient_name,
          serviceLabel: serviceLabel(record.service),
          status: record.status,
          // No account attached — recorded by staff from a call or the desk.
          phoneBooking: record.user_id === null,
          doctorId: record.doctor_id,
        },
      ];
    }
  );

  // Three fixed tabs (from serviceOptions, not from who happens to have
  // doctors), each grouping the active doctors who offer that service and
  // that doctor's own bookings only.
  const specialties: SpecialtyGroup[] = serviceOptions.map((option) => ({
    serviceSlug: option.value,
    serviceLabel: option.label,
    doctors: doctors
      .filter((d) => d.service_slug === option.value)
      .map((d) => ({
        doctorId: d.doctor_id,
        doctorName: d.name,
        serviceSlug: d.service_slug,
        inClinic: d.in_clinic,
        entries: slotBuilds
          .filter((s) => s.doctorId === d.doctor_id)
          .map((s) => ({
            id: s.id,
            date: s.date,
            time: s.time,
            patientName: s.patientName,
            serviceLabel: s.serviceLabel,
            status: s.status,
            phoneBooking: s.phoneBooking,
          })),
      })),
  }));

  const rows: StaffAppointmentRow[] = records.flatMap((record) => {
    const time = slotTimeToLabel(record.slot_time);
    if (!time) return [];
    return [
      {
        id: record.id,
        patientName: record.patient_name,
        patientDetail: patientDetail(record),
        guardianName: record.guardian_name,
        contactPhone: record.contact_phone,
        contactEmail: record.contact_email,
        serviceLabel: serviceLabel(record.service),
        doctorName: doctorName(record),
        date: record.scheduled_date,
        time,
        status: record.status,
        notes: record.notes,
      },
    ];
  });

  // "Who is booked today" — the roll-call staff and admin use to check people in.
  const todayRows = rows
    .filter((row) => row.date === today && row.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time));

  const pending = rows.filter((row) => row.status === "pending");
  const upcoming = rows.filter(
    (row) => row.status === "approved" && row.date >= today
  );
  const past = rows.filter(
    (row) =>
      row.date <= pastCutoff &&
      (row.status === "completed" ||
        row.status === "cancelled" ||
        (row.status === "approved" && row.date < today))
  );

  return (
    <div className="flex min-h-svh flex-col">
      {/* Only doctors drive the "in clinic" indicator, so only they beat.
          Mounted here because /admin is where a doctor spends their day. */}
      {profile.role === "doctor" && <PresenceHeartbeat />}

      <SiteHeader newMessagesCount={newInquiriesCount ?? 0} />

      {/* Plain white, matching the portal and the landing page. */}
      <main className="flex-1">
        <div className="container-clinic py-16 lg:py-20">
          <AdminBody
            staffName={profile.legal_name}
            role={profile.role}
            todayDate={today}
            doctors={doctors}
            week={week}
            specialties={specialties}
            today={todayRows}
            pending={pending}
            upcoming={upcoming}
            past={past}
            newInquiriesCount={newInquiriesCount ?? 0}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
