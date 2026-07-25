import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Separator } from "@/components/ui/separator";

const serviceLinks = [
  { href: "/#services", label: "Developmental Pediatrician" },
  { href: "/#services", label: "Speech Therapy" },
  { href: "/#services", label: "Occupational Therapy" },
];

const siteLinks = [
  { href: "/#approach", label: "Our Approach" },
  { href: "/#testimonials", label: "Families" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#visit", label: "Visit Us" },
  { href: "/appointment", label: "Book an Appointment" },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 text-white">
      <div className="container-clinic grid gap-12 py-16 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr]">
        <div className="flex flex-col items-start gap-4">
          <Logo surface="dark" />
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            Developmental pediatric, speech, and occupational therapy care —
            delivered with clinical rigor and unhurried attention, for every
            stage of your child&apos;s growth.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide text-white/50 uppercase">
            Services
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {serviceLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-white/80 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide text-white/50 uppercase">
            Clinic
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {siteLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-white/80 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide text-white/50 uppercase">
            Get in Touch
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-white/80">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-blue-400" />
              <span>128 Harborview Lane, Suite 4, Meridian Falls</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-brand-blue-400" />
              <span>(555) 214-0198</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-brand-blue-400" />
              <span>hello@quickstartclinic.com</span>
            </li>
          </ul>
        </div>
      </div>

      <Separator className="bg-white/10" />

      <div className="container-clinic flex flex-col items-center justify-between gap-4 py-6 text-xs text-white/50 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} QuickStart Clinic. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="#" className="transition-colors hover:text-white/80">
            Privacy Policy
          </Link>
          <Link href="#" className="transition-colors hover:text-white/80">
            Terms of Care
          </Link>
        </div>
      </div>
    </footer>
  );
}
