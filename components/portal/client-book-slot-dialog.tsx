"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClientDoctorAppointment } from "@/app/actions/appointments";
import type { AppointmentDefaults } from "@/components/forms/appointment-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  checkPatientInfo,
  clientSlotBookingSchema,
  serviceLabel,
  type ClientSlotBookingValues,
} from "@/lib/validation";

export interface ClickedClientSlot {
  doctorId: string;
  doctorName: string;
  serviceSlug: string;
  /** YYYY-MM-DD */
  date: string;
  /** Display label, e.g. "9:00 AM" */
  time: string;
}

/**
 * The family portal's own click-to-book flow — clicking a free cell under a
 * specific doctor's row opens this, pre-filled with that doctor/date/time.
 *
 * This is the one place a signed-in patient picks a specific doctor at all —
 * everywhere else (the standalone /appointment page) still auto-assigns via
 * resolve_doctor(). Clicking a named doctor's own row is treated as an
 * explicit, deliberate choice, not a picker to route around.
 */
export function ClientBookSlotDialog({
  slot,
  defaults,
  onOpenChange,
}: {
  slot: ClickedClientSlot | null;
  defaults: AppointmentDefaults | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function emptyValues(): ClientSlotBookingValues {
    return {
      patientName: "",
      patientInfoType: "dob",
      patientDob: "",
      patientAge: "",
      guardianName: defaults?.guardianName ?? "",
      phone: defaults?.phone ?? "",
      email: defaults?.email ?? "",
      notes: "",
    };
  }

  const resolver: Resolver<ClientSlotBookingValues> = useMemo(() => {
    const zodValidate = zodResolver(clientSlotBookingSchema);
    return async (values, context, options) => {
      const result = await zodValidate(values, context, options);
      const issue = checkPatientInfo(values);
      if (issue) {
        result.errors[issue.path] = { type: "custom", message: issue.message };
      }
      return result;
    };
  }, []);

  const form = useForm<ClientSlotBookingValues>({
    resolver,
    defaultValues: emptyValues(),
  });

  // Fresh form (but keeping the account's own contact details) every time a
  // different cell is clicked.
  useEffect(() => {
    if (slot) form.reset(emptyValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  const patientInfoType = form.watch("patientInfoType");

  async function onSubmit(values: ClientSlotBookingValues) {
    if (!slot) return;
    setIsSubmitting(true);
    const result = await createClientDoctorAppointment(
      slot.doctorId,
      slot.serviceSlug,
      slot.date,
      slot.time,
      values
    );
    setIsSubmitting(false);

    if (result.error) {
      toast.error("Couldn't book that appointment", { description: result.error });
      return;
    }

    toast.success("Appointment request received", {
      description: `We'll confirm your ${serviceLabel(slot.serviceSlug)} visit with ${slot.doctorName} by email within one business day.`,
    });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={slot !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {slot && (
          <>
            <DialogHeader>
              <DialogTitle>
                Book with {slot.doctorName} — {serviceLabel(slot.serviceSlug)}
              </DialogTitle>
              <p className="text-sm text-slate-700">
                {formatLongDate(slot.date)} at {slot.time}
              </p>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
                noValidate
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="patientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="client-slot-patient">Patient name</FormLabel>
                        <FormControl>
                          <Input
                            id="client-slot-patient"
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
                        <FormLabel>Date of birth or age</FormLabel>
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
                </div>

                {patientInfoType === "dob" ? (
                  <FormField
                    control={form.control}
                    name="patientDob"
                    render={({ field }) => (
                      <FormItem className="max-w-xs">
                        <FormLabel htmlFor="client-slot-patient-dob">
                          Patient date of birth
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="client-slot-patient-dob"
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
                        <FormLabel htmlFor="client-slot-patient-age">Patient age</FormLabel>
                        <FormControl>
                          <Input
                            id="client-slot-patient-age"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={17}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="guardianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="client-slot-guardian">
                          Parent or guardian
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="client-slot-guardian"
                            placeholder="Jordan Carter"
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
                        <FormLabel htmlFor="client-slot-phone">Phone</FormLabel>
                        <FormControl>
                          <Input id="client-slot-phone" type="tel" {...field} />
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
                        <FormLabel htmlFor="client-slot-email">Email</FormLabel>
                        <FormControl>
                          <Input id="client-slot-email" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="client-slot-notes">
                        Notes or concerns
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          id="client-slot-notes"
                          rows={3}
                          placeholder="Share anything that would help your care team prepare."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting} className="self-start">
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** "2026-07-25" -> "Saturday, July 25" */
function formatLongDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
