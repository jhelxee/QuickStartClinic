"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createDoctorAppointment } from "@/app/actions/admin";
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
  doctorSlotBookingSchema,
  serviceLabel,
  type DoctorSlotBookingValues,
} from "@/lib/validation";

export interface ClickedSlot {
  doctorId: string;
  doctorName: string;
  serviceSlug: string;
  /** YYYY-MM-DD */
  date: string;
  /** Display label, e.g. "9:00 AM" */
  time: string;
}

const emptyValues: DoctorSlotBookingValues = {
  patientName: "",
  patientInfoType: "dob",
  patientDob: "",
  patientAge: "",
  guardianName: "",
  phone: "",
  email: "",
  notes: "",
  hasAccount: false,
  familyEmail: "",
};

/**
 * The single entry point for staff to book an appointment, opened by clicking
 * a specific doctor's free cell on StaffTimetable — replaces the old
 * always-visible "Record a phone booking" form.
 *
 * Doctor, service, date, and time are already fixed by which cell was
 * clicked (shown here read-only), so there is nothing to pick beyond the
 * account toggle and the patient's own details.
 */
export function BookSlotDialog({
  slot,
  onOpenChange,
}: {
  slot: ClickedSlot | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolver: Resolver<DoctorSlotBookingValues> = useMemo(() => {
    const zodValidate = zodResolver(doctorSlotBookingSchema);
    return async (values, context, options) => {
      const result = await zodValidate(values, context, options);
      const issue = checkPatientInfo(values);
      if (issue) {
        result.errors[issue.path] = { type: "custom", message: issue.message };
      }
      return result;
    };
  }, []);

  const form = useForm<DoctorSlotBookingValues>({
    resolver,
    defaultValues: emptyValues,
  });

  // Fresh form every time a different cell is clicked.
  useEffect(() => {
    if (slot) form.reset(emptyValues);
  }, [slot, form]);

  const hasAccount = form.watch("hasAccount");
  const patientInfoType = form.watch("patientInfoType");

  async function onSubmit(values: DoctorSlotBookingValues) {
    if (!slot) return;
    setIsSubmitting(true);
    const result = await createDoctorAppointment(
      slot.doctorId,
      slot.serviceSlug,
      slot.date,
      slot.time,
      values
    );
    setIsSubmitting(false);

    if (result.error) {
      toast.error("Couldn't record that booking", { description: result.error });
      return;
    }

    toast.success("Booking recorded", {
      description: "It's confirmed and now shows on the timetable.",
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
                <FormField
                  control={form.control}
                  name="hasAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Does this family have an account?</FormLabel>
                      <div
                        role="radiogroup"
                        aria-label="Does this family have an account?"
                        className="inline-flex w-fit rounded-full border border-border bg-ice-50 p-1"
                      >
                        {(
                          [
                            { value: false, label: "No account" },
                            { value: true, label: "Yes, look them up" },
                          ] as const
                        ).map((option) => (
                          <button
                            key={String(option.value)}
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

                {hasAccount && (
                  <FormField
                    control={form.control}
                    name="familyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="slot-family-email">
                          Family account email
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="slot-family-email"
                            type="email"
                            placeholder="family@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="patientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="slot-patient">Patient name</FormLabel>
                        <FormControl>
                          <Input id="slot-patient" placeholder="Riley Carter" {...field} />
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
                        <FormLabel htmlFor="slot-patient-dob">
                          Patient date of birth
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="slot-patient-dob"
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
                        <FormLabel htmlFor="slot-patient-age">Patient age</FormLabel>
                        <FormControl>
                          <Input
                            id="slot-patient-age"
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
                        <FormLabel htmlFor="slot-guardian">Parent or guardian</FormLabel>
                        <FormControl>
                          <Input id="slot-guardian" placeholder="Jordan Carter" {...field} />
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
                        <FormLabel htmlFor="slot-phone">Phone</FormLabel>
                        <FormControl>
                          <Input id="slot-phone" type="tel" {...field} />
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
                        <FormLabel htmlFor="slot-email">Email</FormLabel>
                        <FormControl>
                          <Input id="slot-email" type="email" {...field} />
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
                      <FormLabel htmlFor="slot-notes">Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          id="slot-notes"
                          rows={3}
                          placeholder="Anything the family mentioned."
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
                      Saving&hellip;
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Save booking
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
