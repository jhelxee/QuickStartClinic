import Image from "next/image";
import { Brain, HandHeart, MessageCircleHeart, type LucideIcon } from "lucide-react";

import { BlobMotif } from "@/components/marketing/blob-motif";
import { DoctorStatusBadge } from "@/components/presence/doctor-status";
import { Card, CardContent } from "@/components/ui/card";
import type { DoctorPresence, DoctorRosterEntry } from "@/lib/dal";
import { doctorBios } from "@/lib/schedule-data";

const specialtyIcon: Record<string, LucideIcon> = {
  "Developmental Pediatrician": Brain,
  "Speech Therapy": MessageCircleHeart,
  "Occupational Therapy": HandHeart,
};

function initials(name: string) {
  return name
    .replace(/^(Dr|Mr|Ms|Mrs)\.\s*/, "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function shortDays(days: string[]) {
  return days.map((day) => day.slice(0, 3)).join(", ");
}

export function TeamSection({
  roster,
  presence = [],
}: {
  /** Every active doctor, live from the database — works for logged-out
   *  visitors too. See getDoctorRoster() in lib/dal.ts. */
  roster: DoctorRosterEntry[];
  /** Live "in clinic" status, keyed by doctor id. Same source as Hero — see
   *  the comment there for why this is empty (not badge-less) for logged-out
   *  visitors. */
  presence?: DoctorPresence[];
}) {
  const presenceById = new Map(presence.map((p) => [p.doctor_id, p.in_clinic]));

  return (
    <section id="team" className="relative overflow-hidden bg-white py-24">
      <BlobMotif tone="light" className="-bottom-28 -left-40 h-[380px] w-[380px]" />

      <div className="container-clinic relative">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
            Meet the team
          </span>
          <h2 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
            The people your family will actually see.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-700">
            Three specialists, one shared file — so whoever you meet with
            already knows your child&apos;s story.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {roster.map((doctor) => {
            const Icon = specialtyIcon[doctor.specialty] ?? Brain;
            // undefined (logged out, or no linked account) vs. false (signed
            // in, confirmed not in clinic) are deliberately different — see
            // Hero for the full reasoning. Only the latter shows a badge here.
            const inClinic = presenceById.get(doctor.id);
            // A newly added doctor without hand-written bio copy yet just
            // omits that part of the card rather than crashing — see the
            // comment on doctorBios in lib/schedule-data.ts.
            const bio = doctorBios[doctor.name];
            return (
              <Card key={doctor.id} className="border-border shadow-sm">
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue-50 font-display text-xl text-brand-blue-700">
                      {doctor.photo_url ? (
                        <Image
                          src={doctor.photo_url}
                          alt={doctor.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        initials(doctor.name)
                      )}
                    </div>
                    {inClinic !== undefined && (
                      <DoctorStatusBadge inClinic={inClinic} size="sm" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-lg text-navy-900">{doctor.name}</h3>
                    {bio && (
                      <p className="text-sm font-medium text-brand-blue-700">
                        {bio.credential}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <Icon className="size-3.5" strokeWidth={1.75} />
                      {doctor.specialty}
                    </p>
                  </div>

                  {bio && (
                    <p className="flex-1 text-sm leading-relaxed text-slate-700">{bio.bio}</p>
                  )}

                  <p className="border-t border-border pt-4 text-xs text-slate-400">
                    In clinic: {shortDays(doctor.available_days)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
