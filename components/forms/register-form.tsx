"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/forms/password-input";
import { createClient } from "@/lib/supabase/client";
import {
  checkPasswordsMatch,
  registerSchema,
  sexOptions,
  type RegisterValues,
} from "@/lib/validation";

export function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wraps zodResolver so the password-match check always surfaces, even when
  // other fields also have errors (see checkPasswordsMatch in lib/validation.ts).
  const resolver: Resolver<RegisterValues> = useMemo(() => {
    const zodValidate = zodResolver(registerSchema);
    return async (values, context, options) => {
      const result = await zodValidate(values, context, options);
      const mismatch = checkPasswordsMatch(values);
      if (mismatch) {
        result.errors.confirmPassword = { type: "custom", message: mismatch };
      }
      return result;
    };
  }, []);

  const form = useForm<RegisterValues>({
    resolver,
    defaultValues: {
      legalName: "",
      email: "",
      password: "",
      confirmPassword: "",
      dateOfBirth: "",
      residence: "",
      sex: undefined,
      phone: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setIsSubmitting(true);
    const supabase = createClient();

    // The password goes to Supabase Auth and nowhere else — it is hashed into
    // auth.users and never touches our profiles table.
    //
    // Everything in `options.data` is stored as the auth user's metadata, which
    // the handle_new_user trigger reads to build the profiles row in the SAME
    // transaction (supabase/migrations/02_profile_trigger.sql). That's why there
    // is no second "insert the profile" call here: if signup succeeds, the
    // profile already exists.
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          legal_name: values.legalName,
          date_of_birth: values.dateOfBirth,
          sex: values.sex,
          residence: values.residence,
          phone: values.phone,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      // Attach account-exists errors to the email field where the user is
      // looking, rather than only in a toast.
      if (/already|exists|registered/i.test(error.message)) {
        form.setError("email", {
          type: "server",
          message: "An account with this email already exists.",
        });
        return;
      }
      toast.error("We couldn't create your account", {
        description: error.message,
      });
      return;
    }

    // With "Confirm email" enabled in Supabase, signUp returns a user but no
    // session — they must click the link before they can sign in.
    if (!data.session) {
      toast.success("Check your email", {
        description: "Confirm your address to finish setting up your account.",
      });
      router.push("/login");
      return;
    }

    toast.success("Account created", {
      description: `Welcome to QuickStart Clinic, ${values.legalName.split(" ")[0]}.`,
    });
    router.push("/portal");
    // Re-run the server components so they see the new session cookie.
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-medium text-navy-900">
        Create your family account
      </h1>
      <p className="mt-2 text-base text-slate-700">
        One account to book appointments and stay in sync with your child&apos;s
        care team.
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-8 flex flex-col gap-5"
          noValidate
        >
          <FormField
            control={form.control}
            name="legalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="register-legal-name">Legal name</FormLabel>
                <FormControl>
                  <Input
                    id="register-legal-name"
                    autoComplete="name"
                    placeholder="Jordan A. Carter"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="register-email">Email address</FormLabel>
                <FormControl>
                  <Input
                    id="register-email"
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

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="register-password">Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="register-password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="register-confirm-password">
                    Confirm password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="register-confirm-password"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="register-dob">Date of birth</FormLabel>
                  <FormControl>
                    <Input id="register-dob" type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="register-sex">Sex</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger id="register-sex" className="w-full">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sexOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="residence"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="register-residence">Residence</FormLabel>
                <FormControl>
                  <Input
                    id="register-residence"
                    autoComplete="address-level2"
                    placeholder="City, State"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="register-phone">Phone number</FormLabel>
                <FormControl>
                  <Input
                    id="register-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(555) 123-4567"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account&hellip;
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                Create Account
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
