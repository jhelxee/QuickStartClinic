"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createAppointment } from "@/app/actions/appointments";
import { cn } from "@/lib/utils";
import {
  appointmentSchema,
  checkPatientInfo,
  serviceLabel,
  serviceOptions,
  timeSlots,
  type AppointmentValues,
} from "@/lib/validation";

/** Prefill values from the signed-in account's profile row. */
export interface AppointmentDefaults {
  guardianName: string;
  email: string;
  phone: string;
}

export function AppointmentForm({ defaults }: { defaults: AppointmentDefaults }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wraps zodResolver so the patient DOB/age requirement always surfaces,
  // even when other fields also have errors (see checkPatientInfo in lib/validation.ts).
  const resolver: Resolver<AppointmentValues> = useMemo(() => {
    const zodValidate = zodResolver(appointmentSchema);
    return async (values, context, options) => {
      const result = await zodValidate(values, context, options);
      const issue = checkPatientInfo(values);
      if (issue) {
        result.errors[issue.path] = { type: "custom", message: issue.message };
      }
      return result;
    };
  }, []);

  const form = useForm<AppointmentValues>({
    resolver,
    defaultValues: {
      service: undefined,
      preferredDate: "",
      preferredTime: "",
      guardianName: defaults.guardianName,
      patientName: "",
      patientInfoType: "dob",
      patientDob: "",
      patientAge: "",
      phone: defaults.phone,
      email: defaults.email,
      notes: "",
    },
  });

  const patientInfoType = form.watch("patientInfoType");

  async function onSubmit(values: AppointmentValues) {
    setIsSubmitting(true);

    // The server action re-validates everything, resolves the doctor from the
    // service, and takes user_id from the session rather than from us.
    const result = await createAppointment(values);

    setIsSubmitting(false);

    if (result.error) {
      toast.error("We couldn't book that appointment", {
        description: result.error,
      });
      return;
    }

    toast.success("Appointment request received", {
      description: `We'll confirm your ${serviceLabel(values.service)} visit by email within one business day.`,
    });
    form.reset();
    router.push("/portal");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-10" noValidate>
        <fieldset className="flex flex-col gap-5">
          <legend className="font-display text-lg text-navy-900">
            Appointment details
          </legend>

          <FormField
            control={form.control}
            name="service"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="appt-service">Service type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger id="appt-service" className="w-full">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {serviceOptions.map((option) => (
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

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="appt-date">Preferred date</FormLabel>
                  <FormControl>
                    <Input
                      id="appt-date"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="appt-time">Preferred time</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger id="appt-time" className="w-full">
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5 border-t border-border pt-8">
          <legend className="font-display text-lg text-navy-900">
            Parent or guardian
          </legend>

          <FormField
            control={form.control}
            name="guardianName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="appt-guardian-name">Full name</FormLabel>
                <FormControl>
                  <Input
                    id="appt-guardian-name"
                    autoComplete="name"
                    placeholder="Jordan A. Carter"
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="appt-phone">Phone number</FormLabel>
                  <FormControl>
                    <Input
                      id="appt-phone"
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="appt-email">Email address</FormLabel>
                  <FormControl>
                    <Input
                      id="appt-email"
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
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5 border-t border-border pt-8">
          <legend className="font-display text-lg text-navy-900">Patient</legend>

          <FormField
            control={form.control}
            name="patientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="appt-patient-name">Full name</FormLabel>
                <FormControl>
                  <Input
                    id="appt-patient-name"
                    autoComplete="off"
                    placeholder="Riley Carter"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="patientInfoType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient date of birth or age</FormLabel>
                <div
                  role="radiogroup"
                  aria-label="Provide date of birth or age"
                  className="inline-flex w-fit rounded-full border border-border bg-ice-50 p-1"
                >
                  {(
                    [
                      { value: "dob", label: "Date of birth" },
                      { value: "age", label: "Age" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === option.value}
                      onClick={() => field.onChange(option.value)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                        field.value === option.value
                          ? "bg-white text-navy-900 shadow-sm"
                          : "text-slate-400 hover:text-slate-700"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </FormItem>
            )}
          />

          {patientInfoType === "dob" ? (
            <FormField
              control={form.control}
              name="patientDob"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel htmlFor="appt-patient-dob" className="sr-only">
                    Patient date of birth
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="appt-patient-dob"
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="patientAge"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel htmlFor="appt-patient-age" className="sr-only">
                    Patient age
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="appt-patient-age"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={17}
                      placeholder="Age in years"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-5 border-t border-border pt-8">
          <legend className="font-display text-lg text-navy-900">
            Notes or concerns
          </legend>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="appt-notes">
                  What would you like us to know before the visit?
                </FormLabel>
                <FormControl>
                  <Textarea
                    id="appt-notes"
                    placeholder="Share any concerns, prior evaluations, or context that would help your care team prepare."
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <Button type="submit" size="lg" disabled={isSubmitting} className="self-start">
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending request&hellip;
            </>
          ) : (
            <>
              <CalendarCheck className="size-4" />
              Request Appointment
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
