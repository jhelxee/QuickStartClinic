"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUp, Loader2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createDoctor } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { weekDays, type WeekDay } from "@/lib/schedule-data";
import { uploadDoctorPhoto, validateDoctorPhoto } from "@/lib/upload-doctor-photo";
import { doctorSchema, serviceOptions, type DoctorValues } from "@/lib/validation";

const emptyValues: DoctorValues = {
  name: "",
  serviceSlug: "developmental-pediatrician",
  availableDays: [],
  isActive: true,
  photoUrl: "",
};

/**
 * Adds a new row to the doctor master list.
 *
 * Deliberately separate from linking a login account — a clinic can add a
 * doctor's record (name, specialty, schedule) before that person has ever
 * registered, then link their account later once they have. See
 * DoctorMasterTable for the link/unlink step.
 */
export function AddDoctorDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const form = useForm<DoctorValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: emptyValues,
  });

  function toggleDay(day: WeekDay, checked: boolean, current: WeekDay[]) {
    return checked ? [...current, day] : current.filter((d) => d !== day);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be re-picked after an error
    if (!file) return;

    const validationError = validateDoctorPhoto(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
    setIsUploadingPhoto(true);
    try {
      const url = await uploadDoctorPhoto(file);
      form.setValue("photoUrl", url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload photo.");
      setPhotoPreview(null);
      form.setValue("photoUrl", "");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function onSubmit(values: DoctorValues) {
    setIsSubmitting(true);
    const result = await createDoctor(values);
    setIsSubmitting(false);

    if (result.error) {
      toast.error("Couldn't add that doctor", { description: result.error });
      return;
    }

    toast.success("Doctor added");
    form.reset(emptyValues);
    setPhotoPreview(null);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset(emptyValues);
          setPhotoPreview(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg">
          <UserPlus className="size-4" />
          Add doctor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a doctor</DialogTitle>
          <p className="text-sm text-slate-700">
            Their login account can be linked later — this just creates the
            record.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-ice-50">
                {photoPreview ? (
                  // A blob: URL local preview, not a static/remote asset next/image can optimize.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="size-full object-cover" />
                ) : (
                  <ImageUp className="size-6 text-slate-300" aria-hidden="true" />
                )}
              </div>
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-navy-900 transition-colors hover:bg-ice-50">
                  {isUploadingPhoto ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImageUp className="size-4" />
                  )}
                  {isUploadingPhoto ? "Uploading…" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                    disabled={isUploadingPhoto}
                  />
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  Optional — JPEG, PNG, or WebP, up to 5MB.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="new-doctor-name">Name</FormLabel>
                    <FormControl>
                      <Input id="new-doctor-name" placeholder="Dr. Reyes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="new-doctor-service">Service</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger id="new-doctor-service" className="w-full">
                          <SelectValue />
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
            </div>

            <FormField
              control={form.control}
              name="availableDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available days</FormLabel>
                  <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                    {weekDays.map((day) => (
                      <label
                        key={day}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <Checkbox
                          checked={field.value.includes(day)}
                          onCheckedChange={(checked) =>
                            field.onChange(toggleDay(day, checked === true, field.value))
                          }
                        />
                        {day.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2.5 text-sm text-slate-700">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    Accepting bookings
                  </label>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="self-start"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding&hellip;
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Add doctor
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
