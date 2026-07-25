"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#services", label: "Services" },
  { href: "/#approach", label: "Our Approach" },
  { href: "/#testimonials", label: "Families" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#visit", label: "Visit Us" },
];

export function SiteHeader({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isDark = variant === "dark";
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  async function handleLogout() {
    // Clears the Supabase session cookie, then re-runs the server components so
    // nothing private survives the transition.
    await logout();
    toast.success("Signed out");
    router.push("/");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 backdrop-blur-md",
        isDark
          ? "border-b border-white/10 bg-navy-900/85"
          : "border-b border-border/70 bg-white/85"
      )}
    >
      <div className="container-clinic flex h-20 items-center justify-between">
        <Logo surface={isDark ? "dark" : "light"} />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                isDark
                  ? "text-white/80 hover:text-white"
                  : "text-slate-700 hover:text-primary"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className={cn(
                  "hidden sm:inline-flex",
                  isDark && "text-white hover:bg-white/10 hover:text-white"
                )}
              >
                Log Out
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/portal">My Portal</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                asChild
                className={cn(
                  "hidden sm:inline-flex",
                  isDark && "text-white hover:bg-white/10 hover:text-white"
                )}
              >
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/appointment">Book an Appointment</Link>
              </Button>
            </>
          )}
          <MobileNav variant={variant} />
        </div>
      </div>
    </header>
  );
}
