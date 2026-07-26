import { Quote } from "lucide-react";

import { BlobMotif } from "@/components/marketing/blob-motif";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote:
      "For the first time, our pediatrician, speech therapist, and OT were actually comparing notes. We stopped repeating our son's story to a new specialist every month.",
    name: "Priya N.",
    context: "Parent of a 4-year-old, speech & OT client",
  },
  {
    quote:
      "The intake appointment didn't feel like triage — it felt like someone was finally listening. Eighteen months later, our daughter's handwriting goals are actually hers, not a generic checklist.",
    name: "Marcus T.",
    context: "Parent of a 7-year-old, OT client",
  },
  {
    quote:
      "We drove past two closer clinics to keep coming here. The pacing respects that our son is a person first, not a set of milestones to hit on schedule.",
    name: "Aisha R.",
    context: "Parent of a 5-year-old, developmental pediatrics",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative overflow-hidden bg-white py-24">
      <BlobMotif tone="light" className="-bottom-40 -left-24 h-[420px] w-[420px]" />

      <div className="container-clinic relative">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
            Families &amp; caregivers
          </span>
          <h2 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
            What it feels like from the waiting room.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="border-border shadow-sm">
              <CardContent className="flex h-full flex-col justify-between gap-6">
                <Quote className="size-7 text-brand-blue-600" strokeWidth={1.5} />
                <p className="text-base leading-relaxed text-slate-700">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold text-navy-900">{testimonial.name}</p>
                  <p className="text-xs text-slate-400">{testimonial.context}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
