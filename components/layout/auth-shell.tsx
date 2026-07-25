import type React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { BlobMotif } from "@/components/marketing/blob-motif";

const reassurances = [
  "Your information is only ever shared with your care team.",
  "One account for scheduling, forms, and care updates.",
  "Built around families managing more than one specialist.",
];

export function AuthShell({
  children,
  panelEyebrow,
  panelTitle,
  panelBody,
}: {
  children: React.ReactNode;
  panelEyebrow: string;
  panelTitle: string;
  panelBody: string;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-10 px-6 py-10 sm:px-12 lg:px-16 lg:py-12">
        <Logo />
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-navy-900 lg:flex lg:flex-col lg:justify-between lg:p-16">
        <BlobMotif className="-top-24 -right-24 h-[420px] w-[420px] opacity-40" />
        <div className="relative">
          <span className="text-sm font-semibold tracking-wide text-brand-blue-400 uppercase">
            {panelEyebrow}
          </span>
          <h2 className="mt-4 max-w-md font-display text-3xl leading-snug font-medium text-white">
            {panelTitle}
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/70">
            {panelBody}
          </p>
        </div>

        <ul className="relative flex flex-col gap-4">
          {reassurances.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-blue-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AuthFooterLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="mt-8 text-center text-sm text-slate-400">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-brand-blue-700 hover:underline">
        {label}
      </Link>
    </p>
  );
}
