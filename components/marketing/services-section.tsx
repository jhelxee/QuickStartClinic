import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ListChecks } from "lucide-react";

import { BlobMotif } from "@/components/marketing/blob-motif";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { careInfo } from "@/lib/care-steps";

export function ServicesSection() {
  return (
    <section id="services" className="relative overflow-hidden bg-white py-24">
      <BlobMotif tone="light" className="-top-24 -right-32 h-[480px] w-[480px]" />

      <div className="container-clinic relative">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
            What we treat
          </span>
          <h2 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
            Three specialties. One coordinated plan.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-700">
            Every child&apos;s development is connected — so we built a clinic
            where your specialists talk to each other, not just to you.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {careInfo.map((service) => (
            <Card
              key={service.title}
              className="group overflow-hidden border-border pt-0 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Fixed aspect ratio + object-cover so all three crop
                  consistently despite very different source resolutions. The
                  gradient is a neutral black wash rather than a brand color —
                  it grounds the photo's bottom edge regardless of what's
                  around it, and softens how obvious the lower-resolution
                  photos are next to the sharper one. */}
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={service.image.src}
                  alt={service.image.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
              </div>

              <CardHeader>
                <div className="flex size-12 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue-600">
                  <service.icon className="size-6" strokeWidth={1.75} />
                </div>
                <CardTitle className="mt-5">{service.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed text-slate-700">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 border-t border-border pt-5 text-sm text-slate-700">
                  {service.points.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-brand-blue-600" />
                      {point}
                    </li>
                  ))}
                </ul>

                {/* Takes you to a dedicated, illustrated page rather than
                    expanding in place — five steps with icons read better with
                    room to breathe than packed into this card. */}
                <Link
                  href={`/what-to-expect/${service.slug}`}
                  className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-ice-50 px-4 py-3 text-sm font-semibold text-navy-900 transition-colors hover:border-brand-blue-600/40 hover:bg-brand-blue-50"
                >
                  <ListChecks className="size-4 shrink-0 text-brand-blue-600" />
                  <span className="flex-1">See what a visit typically looks like</span>
                  <ArrowRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-blue-600" />
                </Link>

                <Link
                  href="/appointment"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue-600 transition-colors group-hover:text-brand-blue-700"
                >
                  Book this service
                  <ArrowUpRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
