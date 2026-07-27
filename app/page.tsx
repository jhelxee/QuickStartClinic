import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/marketing/hero";
import { ServicesSection } from "@/components/marketing/services-section";
import { TeamSection } from "@/components/marketing/team-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FindUsSection } from "@/components/marketing/find-us-section";
import { CtaBand } from "@/components/marketing/cta-band";
import { getDoctorPresence, getDoctorRoster } from "@/lib/dal";

export default async function Home() {
  // presence is empty for logged-out visitors — see the comment on Hero's
  // `presence` prop for why that's the mechanism keeping this page's default
  // public. roster is NOT auth-gated — it's what lets the doctor list itself
  // (not just the live badge) render for someone who isn't signed in.
  const [roster, presence] = await Promise.all([getDoctorRoster(), getDoctorPresence()]);

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader variant="dark" />
      <main className="flex-1">
        <Hero roster={roster} presence={presence} />
        <ServicesSection />
        <TeamSection roster={roster} presence={presence} />
        <TrustSection />
        <TestimonialsSection />
        <FaqSection />
        <FindUsSection />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
