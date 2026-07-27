import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search, UserRoundSearch } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppointmentStatus } from "@/components/portal/appointment-list";
import { getNewInquiriesCount, requireStaff } from "@/lib/dal";
import { slotTimeToLabel } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";
import { serviceLabel } from "@/lib/validation";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Records — QuickStart Clinic",
  description: "Search a patient's full appointment history.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Full-history search — deliberately separate from /admin.
 *
 * /admin only shows a bounded recent window (see app/admin/page.tsx) so the
 * default dashboard stays fast as the clinic accumulates history. This page
 * is the escape hatch: unbounded, but only runs a query when staff actually
 * search for someone, rather than loading everything by default.
 */

interface RecordRow {
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
  doctors: { name: string } | { name: string }[] | null;
}

const SELECT_COLUMNS =
  "id, service, scheduled_date, slot_time, status, patient_name, patient_dob, patient_age, guardian_name, contact_phone, contact_email, notes, doctors(name)";

const RESULT_LIMIT = 100;

const statusStyles: Record<AppointmentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-brand-blue-50 text-brand-blue-700 ring-brand-blue-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-400/20",
};

const statusCopy: Record<AppointmentStatus, string> = {
  pending: "Awaiting confirmation",
  approved: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

function doctorName(record: RecordRow): string {
  const { doctors } = record;
  if (!doctors) return "To be assigned";
  return Array.isArray(doctors) ? (doctors[0]?.name ?? "To be assigned") : doctors.name;
}

function patientDetail(record: RecordRow): string {
  if (record.patient_age !== null) return `age ${record.patient_age}`;
  if (record.patient_dob) return `b. ${record.patient_dob}`;
  return "age not given";
}

/** "2026-07-25" -> "Saturday, July 25, 2026" */
function formatLongDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [, { q }, newMessagesCount] = await Promise.all([
    requireStaff(),
    searchParams,
    getNewInquiriesCount(),
  ]);
  const query = q?.trim() ?? "";

  let results: RecordRow[] = [];
  if (query) {
    const supabase = await createClient();
    // Two separate queries rather than one .or() filter — the search term is
    // free text a staff member typed, and building a PostgREST or= expression
    // out of unescaped user input is the kind of string-concatenation-into-a-
    // filter pattern this codebase avoids elsewhere. Merged and de-duplicated
    // below instead.
    const [byPatient, byGuardian] = await Promise.all([
      supabase
        .from("appointments")
        .select(SELECT_COLUMNS)
        .ilike("patient_name", `%${query}%`)
        .order("scheduled_date", { ascending: false })
        .order("slot_time", { ascending: false })
        .limit(RESULT_LIMIT),
      supabase
        .from("appointments")
        .select(SELECT_COLUMNS)
        .ilike("guardian_name", `%${query}%`)
        .order("scheduled_date", { ascending: false })
        .order("slot_time", { ascending: false })
        .limit(RESULT_LIMIT),
    ]);

    const merged = new Map<string, RecordRow>();
    for (const record of [
      ...((byPatient.data ?? []) as unknown as RecordRow[]),
      ...((byGuardian.data ?? []) as unknown as RecordRow[]),
    ]) {
      merged.set(record.id, record);
    }
    // Date first, then time-of-day within that date — without the second key,
    // two same-day visits fall back to whatever order the merge happened to
    // produce, which isn't reliably "latest first".
    results = Array.from(merged.values())
      .sort(
        (a, b) =>
          b.scheduled_date.localeCompare(a.scheduled_date) ||
          b.slot_time.localeCompare(a.slot_time)
      )
      .slice(0, RESULT_LIMIT);
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader newMessagesCount={newMessagesCount} />

      <main className="flex-1">
        <div className="container-clinic py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
                Records
              </span>
              <h1 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
                Patient history
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-700">
                Search across every appointment ever booked — not just the
                recent window shown on the schedule.
              </p>
            </div>
            <Button variant="outline" size="lg" asChild>
              <Link href="/admin">
                <ArrowLeft className="size-4" />
                Back to schedule
              </Link>
            </Button>
          </div>

          <form method="GET" className="mt-10 flex max-w-lg gap-3">
            <Input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by patient or guardian name"
              aria-label="Search by patient or guardian name"
            />
            <Button type="submit">
              <Search className="size-4" />
              Search
            </Button>
          </form>

          <div className="mt-8">
            {!query ? (
              <p className="flex items-center gap-2.5 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-slate-700">
                <UserRoundSearch className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                Search for a name to see a patient&apos;s full visit history.
              </p>
            ) : results.length === 0 ? (
              <p className="flex items-center gap-2.5 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-slate-700">
                <UserRoundSearch className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                No appointments found for &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-700">
                  {results.length} appointment{results.length === 1 ? "" : "s"} found
                  {results.length === RESULT_LIMIT && " (showing the most recent " + RESULT_LIMIT + ")"}
                </p>
                <div className="mt-4 max-h-[640px] overflow-y-auto pr-1">
                  <ul className="flex flex-col gap-3">
                    {results.map((record) => {
                      const time = slotTimeToLabel(record.slot_time);
                      return (
                        <li
                          key={record.id}
                          className="rounded-2xl border border-border bg-white p-5"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <p className="font-medium text-navy-900">
                              {record.patient_name}{" "}
                              <span className="font-normal text-slate-400">
                                ({patientDetail(record)})
                              </span>
                            </p>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                                statusStyles[record.status]
                              )}
                            >
                              {statusCopy[record.status]}
                            </span>
                          </div>

                          <p className="mt-1.5 text-sm text-slate-700">
                            {serviceLabel(record.service)} &middot;{" "}
                            {formatLongDate(record.scheduled_date)}
                            {time && ` at ${time}`} &middot; {doctorName(record)}
                          </p>

                          <p className="mt-1.5 text-sm text-slate-400">
                            Guardian: {record.guardian_name} &middot; {record.contact_phone}{" "}
                            &middot; {record.contact_email}
                          </p>

                          {record.notes && (
                            <p className="mt-3 rounded-lg bg-ice-50 p-3 text-sm leading-relaxed text-slate-700">
                              <span className="font-medium text-navy-900">Notes: </span>
                              {record.notes}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
