import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AddDoctorDialog } from "@/components/admin/add-doctor-dialog";
import {
  DoctorMasterTable,
  type DoctorMasterRow,
} from "@/components/admin/doctor-master-table";
import {
  StaffAccessTable,
  type AccessRow,
} from "@/components/admin/staff-access-table";
import { Button } from "@/components/ui/button";
import { getNewInquiriesCount, requireAdmin, type Role } from "@/lib/dal";
import type { WeekDay } from "@/lib/schedule-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Master data — QuickStart Clinic",
  description: "Manage doctors, availability, and staff access.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Shape of doctor_master(). Read through that function rather than the table
 * because `user_id` and `last_seen_at` are no longer readable through the API
 * by anyone — see supabase/migrations/11_fix_doctor_column_exposure.sql. The
 * function returns the derived presence flag instead of the raw timestamp.
 */
interface DoctorRecord {
  id: string;
  name: string;
  specialty: string;
  service_slug: string;
  available_days: WeekDay[];
  is_active: boolean;
  user_id: string | null;
  in_clinic: boolean;
  photo_url: string | null;
}

interface ProfileRecord {
  id: string;
  email: string;
  legal_name: string;
  role: Role;
}

export default async function MasterDataPage() {
  // Admin only. Staff and doctors are bounced back to /admin.
  const admin = await requireAdmin();
  const supabase = await createClient();

  // doctor_master() includes retired doctors and the account links, neither of
  // which the patient-facing doctor_presence() returns. Its is_admin() guard
  // means a non-admin calling it gets an empty list.
  const [{ data: doctorRows }, { data: profileRows }, newMessagesCount] = await Promise.all([
    supabase.rpc("doctor_master"),
    supabase
      .from("profiles")
      .select("id, email, legal_name, role")
      .order("role")
      .order("legal_name"),
    getNewInquiriesCount(),
  ]);

  const doctors = (doctorRows ?? []) as unknown as DoctorRecord[];
  const profiles = (profileRows ?? []) as unknown as ProfileRecord[];

  const emailById = new Map(profiles.map((p) => [p.id, p.email]));

  // Sorted by service — purely readability now that a specialty can have more
  // than one doctor card in this flat list.
  const doctorRowsMapped: DoctorMasterRow[] = doctors
    .map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      serviceSlug: doctor.service_slug,
      availableDays: doctor.available_days ?? [],
      isActive: doctor.is_active,
      inClinic: doctor.in_clinic,
      linkedEmail: doctor.user_id ? (emailById.get(doctor.user_id) ?? null) : null,
      photoUrl: doctor.photo_url,
    }))
    .sort((a, b) => a.serviceSlug.localeCompare(b.serviceSlug));

  const people: AccessRow[] = profiles.map((profile) => ({
    id: profile.id,
    email: profile.email,
    legalName: profile.legal_name,
    role: profile.role,
    isSelf: profile.id === admin.id,
  }));

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader newMessagesCount={newMessagesCount} />

      {/* Plain white, matching the portal and the landing page. */}
      <main className="flex-1">
        <div className="container-clinic py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
                Administrator
              </span>
              <h1 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
                Master data
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-700">
                Doctors, availability, and who can access what. Only
                administrators can open this page or change anything on it.
              </p>
            </div>
            <Button variant="outline" size="lg" asChild>
              <Link href="/admin">
                <ArrowLeft className="size-4" />
                Back to schedule
              </Link>
            </Button>
          </div>

          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-navy-900">Doctors</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-700">
                  Add, edit, or retire doctor records here — linking a login
                  account is what grants clinic access and drives presence, and
                  is the only way an account becomes a doctor.
                </p>
              </div>
              <AddDoctorDialog />
            </div>
            <div className="mt-5">
              <DoctorMasterTable doctors={doctorRowsMapped} />
            </div>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-xl text-navy-900">Staff access</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-700">
              Promote a family account to Staff or Admin here. Doctor access
              isn&apos;t set from this list — link their account in Doctors
              above instead. You can&apos;t change your own role; that takes a
              second administrator.
            </p>
            <div className="mt-5">
              <StaffAccessTable people={people} />
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
