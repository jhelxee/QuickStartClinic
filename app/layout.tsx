import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { getUser } from "@/lib/dal";
import { toPatient } from "@/lib/patient";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuickStart Clinic — Developmental Pediatrics, Speech & Occupational Therapy",
  description:
    "QuickStart Clinic provides developmental pediatric, speech therapy, and occupational therapy care for children — evidence-based, family-centered, and built around your child's timeline.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolved on the server so the header and portal render correctly in the
  // first HTML — no logged-out flash before the client catches up. Every page
  // shows auth state, so every page depends on this.
  const initialUser = toPatient(await getUser());

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${jakarta.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <AuthProvider initialUser={initialUser}>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
