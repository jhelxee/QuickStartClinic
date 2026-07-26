import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { InquiriesTable, type InquiryRow } from "@/components/admin/inquiries-table";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Messages — QuickStart Clinic",
  description: "Messages submitted through the website contact form.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "new" | "read" | "archived";
  created_at: string;
}

export default async function InquiriesPage() {
  // Staff and doctors can read these, not just admins — same reasoning as the
  // rest of /admin: this is operational, not master data.
  await requireStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("contact_inquiries")
    .select("id, name, email, phone, message, status, created_at")
    .order("created_at", { ascending: false });

  const inquiries: InquiryRow[] = ((data ?? []) as InquiryRecord[]).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  }));

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container-clinic py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
                Messages
              </span>
              <h1 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
                Website inquiries
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-700">
                Messages from visitors who reached out through the contact
                form instead of booking directly.
              </p>
            </div>
            <Button variant="outline" size="lg" asChild>
              <Link href="/admin">
                <ArrowLeft className="size-4" />
                Back to schedule
              </Link>
            </Button>
          </div>

          <div className="mt-10">
            <InquiriesTable inquiries={inquiries} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
