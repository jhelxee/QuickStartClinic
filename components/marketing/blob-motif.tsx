import { cn } from "@/lib/utils";

/**
 * Abstract background texture echoing the cloud/flower shape in the brand mark.
 * Purely decorative — kept out of the accessibility tree.
 */
export function BlobMotif({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 600 600"
      className={cn("pointer-events-none absolute", className)}
    >
      <g fill="none" fillRule="evenodd">
        <circle cx="230" cy="210" r="170" fill="var(--brand-blue-100)" opacity="0.55" />
        <circle cx="380" cy="150" r="110" fill="var(--brand-blue-50)" opacity="0.7" />
        <circle cx="340" cy="330" r="150" fill="var(--brand-blue-400)" opacity="0.12" />
      </g>
    </svg>
  );
}
