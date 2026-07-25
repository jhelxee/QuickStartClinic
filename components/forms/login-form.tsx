"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/forms/password-input";
import { resolveLandingPath } from "@/app/actions/session";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginValues } from "@/lib/validation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onSubmit(values: LoginValues) {
    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setIsSubmitting(false);
      // Deliberately vague, and attached to the password field. Saying "no
      // account with that email" would let anyone test which addresses are
      // registered at a paediatric clinic.
      form.setError("password", {
        type: "server",
        message: "Email or password is incorrect.",
      });
      return;
    }

    // Role lives in `profiles`, which only the server can read on this user's
    // behalf — so ask where this account belongs. Staff and admin go straight
    // to the Staff View rather than the family portal.
    const landing = await resolveLandingPath();
    setIsSubmitting(false);

    toast.success("Welcome back to QuickStart Clinic", {
      description: `Signed in as ${values.email}`,
    });

    // proxy.ts adds ?next=... when it bounces you off a private page, so an
    // explicit destination wins over the role default.
    const next = searchParams.get("next");
    const destination = next?.startsWith("/") ? next : landing;

    // replace(), not push() — going Back to a login form you've already used
    // isn't useful, and it stops the browser re-submitting it.
    //
    // Deliberately NO router.refresh() here. refresh() refetches the route you
    // are currently on, which is /login — and proxy.ts redirects an
    // authenticated user away from /login, so that refetch races the navigation
    // and cancels it. The destination renders on the server with the new cookie
    // regardless, and AuthProvider's onAuthStateChange updates the header.
    router.replace(destination);
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-medium text-navy-900">Welcome back</h1>
      <p className="mt-2 text-base text-slate-700">
        Sign in to manage appointments and care updates for your family.
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-8 flex flex-col gap-5"
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="login-email">Email address</FormLabel>
                <FormControl>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel htmlFor="login-password">Password</FormLabel>
                  <a href="#" className="text-sm font-medium text-brand-blue-700 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <FormControl>
                  <PasswordInput
                    id="login-password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2.5 space-y-0">
                <FormControl>
                  <Checkbox
                    id="login-remember"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel htmlFor="login-remember" className="font-normal text-slate-700">
                  Keep me signed in on this device
                </FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in&hellip;
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                Log In
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
