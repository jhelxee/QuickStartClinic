import { cn } from "@/lib/utils";

/**
 * Abstract background texture echoing the cloud/flower shape in the brand mark.
 * Purely decorative — kept out of the accessibility tree.
 *
 * Two color recipes, not one gradient of opacities, because "pale blue at low
 * opacity" behaves completely differently depending on what's behind it. On
 * navy, pale/light fills glow softly. On white, those exact same pale fills
 * are nearly indistinguishable from the page itself — so "light" leans on the
 * more saturated brand-blue-400/600 at low opacity instead of the pale
 * 50/100 shades, which is what actually reads as a visible tint on white.
 */
export function BlobMotif({
  className,
  tone = "dark",
}: {
  className?: string;
  /** "dark" for navy sections (default), "light" for white sections. */
  tone?: "dark" | "light";
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 600 600"
      className={cn("pointer-events-none absolute", className)}
    >
      {tone === "dark" ? (
        <g fill="none" fillRule="evenodd">
          <circle cx="230" cy="210" r="170" fill="var(--brand-blue-100)" opacity="0.55" />
          <circle cx="380" cy="150" r="110" fill="var(--brand-blue-50)" opacity="0.7" />
          <circle cx="340" cy="330" r="150" fill="var(--brand-blue-400)" opacity="0.12" />
        </g>
      ) : (
        <g fill="none" fillRule="evenodd">
          <circle cx="230" cy="210" r="170" fill="var(--brand-blue-400)" opacity="0.1" />
          <circle cx="380" cy="150" r="110" fill="var(--brand-blue-100)" opacity="0.6" />
          <circle cx="340" cy="330" r="150" fill="var(--brand-blue-600)" opacity="0.06" />
        </g>
      )}
    </svg>
  );
}
