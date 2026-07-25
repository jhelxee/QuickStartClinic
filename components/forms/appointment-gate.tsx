import Link from "next/link";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AppointmentGate() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-white px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-700">
        <LockKeyhole className="size-6" strokeWidth={1.75} />
      </div>
      <div className="max-w-sm">
        <h2 className="font-display text-2xl font-medium text-navy-900">
          You&apos;ll need an account to book
        </h2>
        <p className="mt-2 text-base leading-relaxed text-slate-700">
          Creating a free family account lets us keep your child&apos;s
          appointments, history, and care team in one place — and keeps
          appointment details private to your family.
        </p>
      </div>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" asChild>
          <Link href="/register">
            <UserPlus className="size-4" />
            Create Account
          </Link>
        </Button>
        <Button size="lg" variant="secondary" asChild>
          <Link href="/login">
            <LogIn className="size-4" />
            Log In
          </Link>
        </Button>
      </div>
    </div>
  );
}
