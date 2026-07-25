import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell, AuthFooterLink } from "@/components/layout/auth-shell";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  title: "Log In — QuickStart Clinic",
  description: "Sign in to your QuickStart Clinic family account.",
};

export default function LoginPage() {
  return (
    <AuthShell
      panelEyebrow="Family Portal"
      panelTitle="One account for every specialist your child sees here."
      panelBody="Track appointments, message your care team, and see shared progress notes across pediatrics, speech, and occupational therapy."
    >
      {/* LoginForm reads the ?next= param proxy.ts adds, which requires a
          Suspense boundary around useSearchParams. */}
      <Suspense fallback={<div className="min-h-[22rem]" />}>
        <LoginForm />
      </Suspense>
      <AuthFooterLink
        prompt="New to QuickStart Clinic?"
        href="/register"
        label="Create an account"
      />
    </AuthShell>
  );
}
