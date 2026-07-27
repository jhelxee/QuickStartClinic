"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { ActionResult } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rescheduleSchema, timeSlots, type RescheduleValues } from "@/lib/validation";

const emptyValues: RescheduleValues = { preferredDate: "", preferredTime: "" };

/**
 * Self-contained "Reschedule" button + dialog — shared by the client
 * portal's AppointmentList and the staff AppointmentActions, since both need
 * the exact same "pick a new date and time" form. Only the server action it
 * calls differs: rescheduleAppointment (own booking, forced back to
 * pending) vs rescheduleAppointmentAsStaff (any booking, status untouched).
 */
export function RescheduleDialog({
  id,
  action,
}: {
  id: string;
  action: (id: string, values: unknown) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RescheduleValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: emptyValues,
  });

  async function onSubmit(values: RescheduleValues) {
    setIsSubmitting(true);
    const result = await action(id, values);
    setIsSubmitting(false);

    if (result.error) {
      toast.error("Couldn't reschedule", { description: result.error });
      return;
    }

    toast.success("Appointment rescheduled");
    form.reset(emptyValues);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(emptyValues);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="size-4" />
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <p className="text-sm text-slate-700">Choose a new date and time.</p>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="reschedule-date">New date</FormLabel>
                  <FormControl>
                    <Input
                      id="reschedule-date"
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
                  <FormLabel htmlFor="reschedule-time">New time</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger id="reschedule-time" className="w-full">
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

            <Button type="submit" disabled={isSubmitting} className="self-start">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving&hellip;
                </>
              ) : (
                "Save new time"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
