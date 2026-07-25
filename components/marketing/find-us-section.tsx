import { Clock, MapPin, Navigation, Phone } from "lucide-react";

import { ClinicMapIllustration } from "@/components/marketing/clinic-map-illustration";
import { Button } from "@/components/ui/button";
import { officeHours } from "@/lib/schedule-data";

const address = "128 Harborview Lane, Suite 4, Meridian Falls";
const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  address
)}`;

export function FindUsSection() {
  return (
    <section id="visit" className="bg-navy-900 py-24">
      <div className="container-clinic grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <span className="text-sm font-semibold tracking-wide text-brand-blue-400 uppercase">
            Find us
          </span>
          <h2 className="mt-3 font-display text-3xl font-medium text-white sm:text-4xl">
            Easy to find, easier to get to.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            One location, one parking lot, one front desk — no navigating a
            hospital campus with a nervous kid in tow.
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            <li className="flex items-start gap-3 text-sm text-white/80">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-blue-400" />
              {address}
            </li>
            <li className="flex items-start gap-3 text-sm text-white/80">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand-blue-400" />
              (555) 214-0198
            </li>
            <li className="flex items-start gap-3 text-sm text-white/80">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand-blue-400" />
              <span className="flex flex-col gap-1">
                {officeHours.map((entry) => (
                  <span key={entry.day}>
                    {entry.day}: {entry.hours}
                  </span>
                ))}
              </span>
            </li>
          </ul>

          <Button
            asChild
            variant="outline"
            className="mt-8 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              Get Directions
              <Navigation className="size-4" />
            </a>
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-navy-900/30">
          <ClinicMapIllustration className="aspect-[13/9]" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 shadow-md">
            <MapPin className="size-4 shrink-0 text-brand-blue-600" />
            <span className="text-sm font-semibold text-navy-900">QuickStart Clinic</span>
          </div>
        </div>
      </div>
    </section>
  );
}
