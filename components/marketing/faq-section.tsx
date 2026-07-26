import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BlobMotif } from "@/components/marketing/blob-motif";

const faqs = [
  {
    question: "What age range does QuickStart Clinic see?",
    answer:
      "We work with children from 18 months through 17 years, with the majority of our developmental pediatric and early-intervention caseload between ages 2 and 10.",
  },
  {
    question: "Do we need a referral before booking?",
    answer:
      "No referral is required for an initial consultation. If ongoing therapy is recommended, we'll help you understand what your insurance plan does or doesn't require afterward.",
  },
  {
    question: "What actually happens at the first visit?",
    answer:
      "A 45-minute conversation and observation with the relevant specialist — no rushed checklist. You'll leave with a written summary and, where appropriate, a proposed coordinated plan across specialties.",
  },
  {
    question: "Can one child see multiple specialists here?",
    answer:
      "Yes — that's the core of how we're built. A child seeing our developmental pediatrician, speech therapist, and occupational therapist has one shared file and one point of contact, not three separate intakes.",
  },
  {
    question: "How far in advance should we book?",
    answer:
      "Initial consultations typically have a 2–3 week lead time. If your family is navigating an urgent concern, mention it when booking and our care coordinator will do what's possible to move sooner.",
  },
  {
    question: "What should we bring to the first appointment?",
    answer:
      "Any prior evaluations, IEP or 504 documentation, a list of current medications, and — most usefully — your own honest account of what you're noticing day to day.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="relative overflow-hidden bg-white py-24">
      <BlobMotif tone="light" className="-top-24 -left-32 h-[380px] w-[380px]" />

      <div className="container-clinic relative grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="max-w-md">
          <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
            Good to know
          </span>
          <h2 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
            Questions families ask before their first visit.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Don&apos;t see your question here?{" "}
            <Link
              href="/#contact"
              className="font-semibold text-brand-blue-700 hover:text-brand-blue-600"
            >
              Send our care coordination team a message
            </Link>{" "}
            and we&apos;ll answer before you book.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="rounded-2xl border border-border bg-ice-50 px-6 sm:px-8"
        >
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
