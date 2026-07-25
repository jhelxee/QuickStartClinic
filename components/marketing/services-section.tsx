import Link from "next/link";
import { ArrowUpRight, Brain, HandHeart, MessageCircleHeart } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const services = [
  {
    icon: Brain,
    title: "Developmental Pediatrician",
    description:
      "Comprehensive developmental evaluations and ongoing medical guidance for delays in motor skills, language, behavior, and social-emotional growth.",
    points: ["Diagnostic evaluations", "Growth & milestone tracking", "Coordinated referrals"],
  },
  {
    icon: MessageCircleHeart,
    title: "Speech Therapy",
    description:
      "Individualized therapy for articulation, language delay, fluency, and feeding — building the communication skills your child needs to be understood.",
    points: ["Articulation & language", "Feeding & swallowing support", "AAC & communication tools"],
  },
  {
    icon: HandHeart,
    title: "Occupational Therapy",
    description:
      "Hands-on support for fine motor skills, sensory processing, and everyday independence — from handwriting to getting dressed with confidence.",
    points: ["Sensory integration", "Fine & gross motor skills", "Everyday independence skills"],
  },
];

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
          {services.map((service) => (
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
                <Link
                  href="/appointment"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue-400 transition-colors group-hover:text-brand-blue-300"
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
