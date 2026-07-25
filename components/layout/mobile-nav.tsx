"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#services", label: "Services" },
  { href: "/#approach", label: "Our Approach" },
  { href: "/#testimonials", label: "Families" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#visit", label: "Visit Us" },
];

export function MobileNav({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  async function handleLogout() {
    setOpen(false);
    await logout();
    toast.success("Signed out");
    router.push("/");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "lg:hidden",
            variant === "dark" && "text-white hover:bg-white/10 hover:text-white"
          )}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-6" aria-label="Mobile">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-border p-6">
          {isAuthenticated ? (
            <>
              <Button variant="secondary" onClick={handleLogout}>
                Log Out
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link href="/portal">My Portal</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" asChild onClick={() => setOpen(false)}>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link href="/appointment">Book an Appointment</Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
