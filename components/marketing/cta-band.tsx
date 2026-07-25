import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BlobMotif } from "@/components/marketing/blob-motif";

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-navy-900 py-20">
      <BlobMotif className="-bottom-40 -left-32 h-[480px] w-[480px] opacity-40" />

      <div className="container-clinic relative flex flex-col items-center gap-6 text-center">
        <h2 className="max-w-2xl font-display text-3xl font-medium text-white sm:text-4xl">
          Ready to give your child one coordinated plan?
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-white/70">
          Book a first consultation and meet the specialists who will actually
          be on your child&apos;s care team — not a call center.
        </p>
        <Button size="lg" asChild className="mt-2">
          <Link href="/appointment">
            Book an Appointment
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
