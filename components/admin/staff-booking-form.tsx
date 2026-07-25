"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PhoneCall, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { createStaffAppointment } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { cn } from "@/lib/utils";
import {
  checkPatientInfo,
  serviceOptions,
  staffAppointmentSchema,
  timeSlots,
  type StaffAppointmentValues,
} from "@/lib/validation";

/**
 * Records a booking taken over the phone or at the desk.
 *
 * Leaving "Family account email" blank stores the appointment with no owner —
 * visible to staff only. That's the normal case for a caller who has never used
 * the website.
 */
export function StaffBookingForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolver: Resolver<StaffAppointmentValues> = useMemo(() => {
    const zodValidate = zodResolver(staffAppointmentSchema);
    return async (values, context, options) => {
      const result = await zodValidate(values, context, options);
      const issue = checkPatientInfo(values);
      if (issue) {
        result.errors[issue.path] = { type: "custom", message: issue.message };
      }
      return result;
    };
  }, []);

  const form = useForm<StaffAppointmentValues>({
    resolver,
    defaultValues: {
      service: undefined,
      preferredDate: "",
      preferredTime: "",
      guardianName: "",
      patientName: "",
      patientInfoType: "dob",
      patientDob: "",
      patientAge: "",
      phone: "",
      email: "",
      notes: "",
      familyEmail: "",
    },
  });

  const patientInfoType = form.watch("patientInfoType");

  async function onSubmit(values: StaffAppointmentValues) {
    setIsSubmitting(true);
    const result = await createStaffAppointment(values);
    setIsSubmitting(false);

    if (result.error) {
      toast.error("Couldn't record that booking", { description: result.error });
      return;
    }

    toast.success("Booking recorded", {
      description: "It's confirmed and now shows on the timetable.",
    });
    form.reset();
    setIsOpen(false);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <Button size="lg" onClick={() => setIsOpen(true)}>
        <PhoneCall className="size-4" />
        Record a phone booking
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg text-navy-900">
            Record a phone booking
          </h3>
          <p className="mt-1 text-sm text-slate-700">
            For families who booked by phone or at the desk. Saved as confirmed.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => setIsOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-5"
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="staff-service">Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger id="staff-service" className="w-full">
                        <SelectValue placeholder="Select" />
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

            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="staff-date">Date</FormLabel>
                  <FormControl>
                    <Input id="staff-date" type="date" {...field} />
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
                  <FormLabel htmlFor="staff-time">Time</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger id="staff-time" className="w-full">
                        <SelectValue placeholder="Select" />
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

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="staff-patient">Patient name</FormLabel>
                  <FormControl>
                    <Input id="staff-patient" placeholder="Riley Carter" {...field} />
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
                  <FormLabel htmlFor="staff-patient-dob">
                    Patient date of birth
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="staff-patient-dob"
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
                  <FormLabel htmlFor="staff-patient-age">Patient age</FormLabel>
                  <FormControl>
                    <Input
                      id="staff-patient-age"
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
                  <FormLabel htmlFor="staff-guardian">Parent or guardian</FormLabel>
                  <FormControl>
                    <Input id="staff-guardian" placeholder="Jordan Carter" {...field} />
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
                  <FormLabel htmlFor="staff-phone">Phone</FormLabel>
                  <FormControl>
                    <Input id="staff-phone" type="tel" {...field} />
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
                  <FormLabel htmlFor="staff-email">Email</FormLabel>
                  <FormControl>
                    <Input id="staff-email" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="familyEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="staff-family-email">
                  Family account email <span className="text-slate-400">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    id="staff-family-email"
                    type="email"
                    placeholder="Leave blank if they don't have an account"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  If they already have an account, enter it here and the booking
                  will appear in their own portal. Otherwise this stays a
                  staff-only record.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="staff-notes">Notes</FormLabel>
                <FormControl>
                  <Textarea
                    id="staff-notes"
                    rows={3}
                    placeholder="Anything the family mentioned on the call."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
