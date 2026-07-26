"use client";

import { useState, useTransition } from "react";
import { Archive, Inbox, MailOpen } from "lucide-react";
import { toast } from "sonner";

import { updateInquiryStatus } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface InquiryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
}

const statusStyles: Record<InquiryRow["status"], string> = {
  new: "bg-brand-blue-50 text-brand-blue-700 ring-brand-blue-600/20",
  read: "bg-slate-100 text-slate-600 ring-slate-400/20",
  archived: "bg-slate-100 text-slate-400 ring-slate-400/20",
};

export function InquiriesTable({ inquiries }: { inquiries: InquiryRow[] }) {
  if (inquiries.length === 0) {
    return (
      <p className="flex items-center gap-2.5 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-slate-700">
        <Inbox className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
        No messages yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {inquiries.map((inquiry) => (
        <InquiryCard key={inquiry.id} inquiry={inquiry} />
      ))}
    </ul>
  );
}

function InquiryCard({ inquiry }: { inquiry: InquiryRow }) {
  const [status, setStatus] = useState(inquiry.status);
  const [isPending, startTransition] = useTransition();

  function apply(next: "read" | "archived") {
    startTransition(async () => {
      const result = await updateInquiryStatus(inquiry.id, next);
      if (result.error) {
        toast.error("Couldn't update", { description: result.error });
        return;
      }
      setStatus(next);
    });
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-5 rounded-2xl border border-border bg-white p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="font-medium text-navy-900">{inquiry.name}</p>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
              statusStyles[status]
            )}
          >
            {status}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-700">
          {inquiry.email}
          {inquiry.phone ? ` · ${inquiry.phone}` : ""}
        </p>

        <p className="mt-3 rounded-lg bg-ice-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
          {inquiry.message}
        </p>

        <p className="mt-2 text-xs text-slate-400">{formatDate(inquiry.createdAt)}</p>
      </div>

      <div className="flex shrink-0 gap-2">
        {status === "new" && (
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => apply("read")}>
            <MailOpen className="size-4" />
            Mark read
          </Button>
        )}
        {status !== "archived" && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => apply("archived")}
          >
            <Archive className="size-4" />
            Archive
          </Button>
        )}
      </div>
    </li>
  );
}

/** "2026-07-25T09:00:00Z" -> "July 25, 9:00 AM" */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
