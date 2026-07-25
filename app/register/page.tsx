import type { Metadata } from "next";

import { AuthShell, AuthFooterLink } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = {
  title: "Create an Account — QuickStart Clinic",
  description: "Create a QuickStart Clinic family account to book and manage appointments.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      panelEyebrow="Get Started"
      panelTitle="Set up your family account in under two minutes."
      panelBody="You'll use this account to book appointments, complete intake forms, and hear from your care team between visits."
    >
      <RegisterForm />
      <AuthFooterLink
        prompt="Already have an account?"
        href="/login"
        label="Log in"
      />
    </AuthShell>
  );
}
