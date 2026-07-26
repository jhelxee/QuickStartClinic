import { Clock, MapPin, Navigation, Phone } from "lucide-react";

import { BlobMotif } from "@/components/marketing/blob-motif";
import { ClinicMapIllustration } from "@/components/marketing/clinic-map-illustration";
import { ContactForm } from "@/components/marketing/contact-form";
import { Button } from "@/components/ui/button";
import { officeHours } from "@/lib/schedule-data";

const address = "128 Harborview Lane, Suite 4, Meridian Falls";
const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  address
)}`;

export function FindUsSection() {
  return (
    <section id="visit" className="relative overflow-hidden bg-white py-24">
      {/* Smaller and further back than the other two — the map illustration
          already carries visual interest on this section, this just keeps
          the left/text side from feeling bare by comparison. */}
      <BlobMotif tone="light" className="-top-16 -left-16 h-[340px] w-[340px]" />

      <div className="container-clinic relative grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <span className="text-sm font-semibold tracking-wide text-brand-blue-700 uppercase">
            Find us
          </span>
          <h2 className="mt-3 font-display text-3xl font-medium text-navy-900 sm:text-4xl">
            Easy to find, easier to get to.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            One location, one parking lot, one front desk — no navigating a
            hospital campus with a nervous kid in tow.
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            <li className="flex items-start gap-3 text-sm text-slate-700">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-blue-600" />
              {address}
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-700">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand-blue-600" />
              (555) 214-0198
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-700">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand-blue-600" />
              <span className="flex flex-col gap-1">
                {officeHours.map((entry) => (
                  <span key={entry.day}>
                    {entry.day}: {entry.hours}
                  </span>
                ))}
              </span>
            </li>
          </ul>

          <Button asChild variant="outline" className="mt-8">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              Get Directions
              <Navigation className="size-4" />
            </a>
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border shadow-xl shadow-navy-900/10">
          <ClinicMapIllustration className="aspect-[13/9]" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 shadow-md">
            <MapPin className="size-4 shrink-0 text-brand-blue-600" />
            <span className="text-sm font-semibold text-navy-900">QuickStart Clinic</span>
          </div>
        </div>
      </div>

      {/* Not everyone who lands here is ready to pick a date and time — this
          is the low-commitment alternative to the booking flow, and what the
          FAQ section's "reach our team" line actually points to. */}
      <div id="contact" className="container-clinic relative mt-16">
        <div className="rounded-2xl border border-border bg-ice-50 p-8 sm:p-10">
          <h3 className="font-display text-xl text-navy-900">Not ready to book?</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-700">
            Send us a message and our care coordination team will follow up —
            no account needed.
          </p>
          <div className="mt-6 max-w-xl">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
