import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** "light" for use on white/ice surfaces, "dark" for use on navy surfaces (e.g. footer) */
  surface?: "light" | "dark";
  href?: string;
}

export function Logo({ className, surface = "light", href = "/" }: LogoProps) {
  const isDark = surface === "dark";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 transition-opacity hover:opacity-90",
        className
      )}
      aria-label="QuickStart Clinic home"
    >
      <Image
        src="/icon.png"
        alt=""
        width={1008}
        height={1040}
        priority
        unoptimized
        className="h-9 w-9 shrink-0"
      />
      <span className="flex flex-col items-center leading-none">
        <span
          className={cn(
            "font-display text-xl font-bold tracking-wide",
            isDark ? "text-white" : "text-navy-900"
          )}
        >
          QuickStart
        </span>
        <span
          className={cn(
            "-mt-0.5 text-xs font-bold tracking-wide uppercase",
            isDark ? "text-brand-blue-400" : "text-brand-blue-600"
          )}
        >
          Clinic
        </span>
      </span>
    </Link>
  );
}
