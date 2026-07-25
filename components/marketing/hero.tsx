import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Clock,
  HandHeart,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BlobMotif } from "@/components/marketing/blob-motif";
import { OfficeStatusBadge } from "@/components/marketing/office-status-badge";
import { doctorSchedule, officeHours } from "@/lib/schedule-data";

function shortDays(days: string[]) {
  return days.map((day) => day.slice(0, 3)).join(", ");
}

const specialtyIcon: Record<string, typeof Brain> = {
  "Developmental Pediatrician": Brain,
  "Speech Therapy": MessageCircleHeart,
  "Occupational Therapy": HandHeart,
};

const trustPoints = [
  "Board-certified developmental pediatricians",
  "Licensed speech-language & occupational therapists",
  "Family-paced plans, not one-size sessions",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-900">
      <BlobMotif className="-top-32 -right-40 h-[560px] w-[560px] opacity-50" />
      <BlobMotif className="-bottom-48 -left-32 h-[420px] w-[420px] opacity-30" />

      <div className="container-clinic relative grid gap-16 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-blue-400 uppercase backdrop-blur-sm">
            <Sparkles className="size-3.5" />
            Developmental Pediatrics &middot; Speech &middot; OT
          </span>

          <h1 className="mt-6 font-display text-4xl leading-[1.1] font-medium text-white sm:text-5xl lg:text-[3.4rem]">
            Care that grows with your child, not against the clock.
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-white/70">
            QuickStart Clinic brings developmental pediatric, speech, and
            occupational therapy together under one unhurried roof — so your
            family gets one coordinated plan instead of three disconnected
            opinions.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/appointment">
                Book an Appointment
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="#services">Explore Our Services</Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-col gap-3">
            {trustPoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-white/70">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-blue-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden lg:block">
          <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-blue-600/20 via-transparent to-transparent blur-2xl" />
          <div className="relative mx-auto flex max-w-sm flex-col gap-5 p-8">
            <div
              className="animate-in fade-in slide-in-from-bottom-6 duration-700 [animation-fill-mode:backwards] [animation-timing-function:ease-out]"
              style={{ animationDelay: "150ms" }}
            >
              <div
                className="motion-safe:animate-float rounded-2xl border border-border bg-white p-6 shadow-xl shadow-navy-900/30"
                style={{ animationDelay: "0s" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand-blue-50 text-brand-blue-600">
                      <Clock className="size-4" />
                    </span>
                    <p className="text-sm font-semibold text-navy-900">Office Hours</p>
                  </div>
                  <OfficeStatusBadge />
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {officeHours.map((entry) => (
                    <div
                      key={entry.day}
                      className="flex items-center justify-between rounded-xl bg-ice-50 px-4 py-2.5"
                    >
                      <p className="text-sm font-medium text-navy-900">{entry.day}</p>
                      <p className="text-xs text-slate-400">{entry.hours}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="animate-in fade-in slide-in-from-bottom-6 duration-700 [animation-fill-mode:backwards] [animation-timing-function:ease-out]"
              style={{ animationDelay: "350ms" }}
            >
              <div
                className="motion-safe:animate-float rounded-2xl border border-border bg-white p-5 shadow-xl shadow-navy-900/30"
                style={{ animationDelay: "1.2s" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-blue-50 text-brand-blue-600">
                    <ShieldCheck className="size-4" />
                  </span>
                  <p className="text-sm font-semibold text-navy-900">Doctor&apos;s Schedule</p>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {doctorSchedule.map((doctor) => {
                    const Icon = specialtyIcon[doctor.specialty] ?? Brain;
                    return (
                      <div key={doctor.name} className="flex items-start gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-700">
                          <Icon className="size-4" strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium whitespace-nowrap text-navy-900">
                            {doctor.name}
                          </p>
                          <p className="text-xs text-slate-400">{doctor.specialty}</p>
                          <p className="mt-0.5 text-xs font-medium text-brand-blue-700">
                            {shortDays(doctor.days)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
