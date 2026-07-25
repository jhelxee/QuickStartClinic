import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/marketing/hero";
import { ServicesSection } from "@/components/marketing/services-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FindUsSection } from "@/components/marketing/find-us-section";
import { CtaBand } from "@/components/marketing/cta-band";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader variant="dark" />
      <main className="flex-1">
        <Hero />
        <ServicesSection />
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
