import { cn } from "@/lib/utils";

/**
 * Stylized, abstract map illustration in the site's own visual language —
 * not a geocoded embed, since the clinic address used across the site is
 * fictional. Purely decorative; the pin location is labeled in HTML on top.
 */
export function ClinicMapIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 520 360"
      className={cn("h-full w-full", className)}
    >
      <rect width="520" height="360" fill="var(--ice-50)" />

      {/* City blocks */}
      <rect x="24" y="24" width="140" height="90" rx="12" fill="var(--brand-blue-50)" />
      <rect x="24" y="140" width="90" height="70" rx="12" fill="var(--brand-blue-50)" />
      <rect x="200" y="24" width="100" height="60" rx="12" fill="var(--brand-blue-50)" />
      <rect x="360" y="40" width="130" height="100" rx="12" fill="var(--brand-blue-50)" />
      <rect x="360" y="200" width="130" height="100" rx="12" fill="var(--brand-blue-50)" />
      <rect x="24" y="250" width="150" height="86" rx="12" fill="var(--brand-blue-50)" />
      <rect x="200" y="230" width="110" height="80" rx="12" fill="var(--brand-blue-50)" />

      {/* Roads */}
      <path d="M0 130H520" stroke="var(--brand-blue-100)" strokeWidth="10" />
      <path d="M0 230H520" stroke="var(--brand-blue-100)" strokeWidth="10" />
      <path d="M190 0V360" stroke="var(--brand-blue-100)" strokeWidth="10" />
      <path d="M340 0V360" stroke="var(--brand-blue-100)" strokeWidth="10" />

      {/* Pulse ring around the clinic pin */}
      <circle cx="265" cy="180" r="46" fill="var(--brand-blue-400)" opacity="0.15" />
      <circle cx="265" cy="180" r="26" fill="var(--brand-blue-400)" opacity="0.2" />

      {/* Pin */}
      <path
        d="M265 150c-13.8 0-25 11.2-25 25 0 18.75 25 45 25 45s25-26.25 25-45c0-13.8-11.2-25-25-25Z"
        fill="var(--brand-blue-600)"
      />
      <circle cx="265" cy="175" r="9" fill="white" />
    </svg>
  );
}
