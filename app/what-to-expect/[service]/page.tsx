import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CtaBand } from "@/components/marketing/cta-band";
import { Button } from "@/components/ui/button";
import { careInfo, getCareInfo } from "@/lib/care-steps";

/**
 * Static, public, and the same for every visitor — no session, no database
 * read. Prerendered for all three services at build time.
 */
export function generateStaticParams() {
  return careInfo.map((service) => ({ service: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ service: string }>;
}): Promise<Metadata> {
  const { service: slug } = await params;
  const service = getCareInfo(slug);
  if (!service) return {};

  return {
    title: `What to Expect — ${service.title} — QuickStart Clinic`,
    description: `A sample step-by-step walkthrough of a first ${service.title.toLowerCase()} visit at QuickStart Clinic.`,
  };
}

export default async function WhatToExpectPage({
  params,
}: {
  // Next 16: params is a Promise and must be awaited.
  params: Promise<{ service: string }>;
}) {
  const { service: slug } = await params;
  const service = getCareInfo(slug);
  if (!service) notFound();

  const otherServices = careInfo.filter((s) => s.slug !== service.slug);

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container-clinic max-w-3xl py-16 lg:py-20">
          <Link
            href="/#services"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Back to services
          </Link>

          <div className="mt-8 flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blue-50 text-brand-blue-600">
              <service.icon className="size-7" strokeWidth={1.75} />
            </span>
            <div>
              <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
                What to expect
              </span>
              <h1 className="mt-1 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
                {service.title}
              </h1>
            </div>
          </div>

          <p className="mt-5 text-lg leading-relaxed text-slate-700">
            {service.description}
          </p>

          <p className="mt-4 flex items-center gap-1.5 text-sm text-slate-400">
            <Clock3 className="size-4 shrink-0" />
            {service.duration}
          </p>

          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/appointment">
                Book this service
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {/* Timeline. Each step leads with its icon, so the shape of a visit
              comes across even to someone skimming without reading a word. */}
          <ol className="mt-14 flex flex-col">
            {service.steps.map((step, index) => {
              const isLast = index === service.steps.length - 1;
              return (
                <li key={step.title} className="relative flex gap-5 pb-10 last:pb-0">
                  {!isLast && (
                    <span
                      className="absolute top-14 left-7 -ml-px h-[calc(100%-3.5rem)] w-0.5 bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-white text-brand-blue-600 shadow-sm">
                    <step.icon className="size-6" strokeWidth={1.75} />
                  </span>
                  <div className="pt-1.5">
                    <span className="text-xs font-semibold tracking-wide text-brand-blue-700 uppercase">
                      Step {index + 1}
                    </span>
                    <p className="mt-1 font-display text-xl text-navy-900">{step.title}</p>
                    <p className="mt-1.5 max-w-xl text-base leading-relaxed text-slate-700">
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-2 max-w-xl text-sm text-slate-400 italic">
            This is a sample flow to help you know what to expect — your care
            team will adjust it to fit your child.
          </p>

          {otherServices.length > 0 && (
            <div className="mt-16 border-t border-border pt-10">
              <p className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
                Other services
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {otherServices.map((other) => (
                  <Link
                    key={other.slug}
                    href={`/what-to-expect/${other.slug}`}
                    className="group flex flex-1 items-center gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-brand-blue-600/40 hover:bg-brand-blue-50/40"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue-600">
                      <other.icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="flex-1 text-sm font-medium text-navy-900">
                      {other.title}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-blue-600" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <CtaBand />
      </main>

      <SiteFooter />
    </div>
  );
}
