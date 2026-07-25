import Link from "next/link";
import { ArrowRight, ArrowUpRight, ListChecks } from "lucide-react";

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
    <section id="services" className="bg-navy-900 py-24">
      <div className="container-clinic">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold tracking-wide text-brand-blue-400 uppercase">
            What we treat
          </span>
          <h2 className="mt-3 font-display text-3xl font-medium text-white sm:text-4xl">
            Three specialties. One coordinated plan.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            Every child&apos;s development is connected — so we built a clinic
            where your specialists talk to each other, not just to you.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {careInfo.map((service) => (
            <Card
              key={service.title}
              className="group border-white/10 bg-white/[0.06] backdrop-blur-sm transition-colors hover:bg-white/[0.09]"
            >
              <CardHeader>
                <div className="flex size-12 items-center justify-center rounded-xl bg-brand-blue-600/20 text-brand-blue-400">
                  <service.icon className="size-6" strokeWidth={1.75} />
                </div>
                <CardTitle className="mt-5 text-white">{service.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed text-white/70">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 border-t border-white/10 pt-5 text-sm text-white/70">
                  {service.points.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-brand-blue-400" />
                      {point}
                    </li>
                  ))}
                </ul>

                {/* Takes you to a dedicated, illustrated page rather than
                    expanding in place — five steps with icons read better with
                    room to breathe than packed into this card. */}
                <Link
                  href={`/what-to-expect/${service.slug}`}
                  className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-brand-blue-400/40 hover:bg-white/[0.08]"
                >
                  <ListChecks className="size-4 shrink-0 text-brand-blue-400" />
                  <span className="flex-1">See what a visit typically looks like</span>
                  <ArrowRight className="size-4 shrink-0 text-white/40 transition-colors group-hover:text-brand-blue-300" />
                </Link>

                <Link
                  href="/appointment"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue-400 transition-colors group-hover:text-brand-blue-300"
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
