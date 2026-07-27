"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ImageUp, Link2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { linkDoctorAccount, updateDoctor } from "@/app/actions/master-data";
import { DoctorStatusBadge } from "@/components/presence/doctor-status";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { serviceOptions } from "@/lib/validation";

export interface DoctorMasterRow {
  id: string;
  name: string;
  specialty: string;
  serviceSlug: string;
  availableDays: WeekDay[];
  isActive: boolean;
  inClinic: boolean;
  linkedEmail: string | null;
  photoUrl: string | null;
}

export function DoctorMasterTable({ doctors }: { doctors: DoctorMasterRow[] }) {
  return (
    <div className="max-h-[640px] overflow-y-auto rounded-2xl border border-border bg-ice-50/40 p-4">
      <div className="flex flex-col gap-4">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: DoctorMasterRow }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(doctor.name);
  const [serviceSlug, setServiceSlug] = useState(doctor.serviceSlug);
  const [days, setDays] = useState<WeekDay[]>(doctor.availableDays);
  const [isActive, setIsActive] = useState(doctor.isActive);
  const [email, setEmail] = useState(doctor.linkedEmail ?? "");
  const [photoUrl, setPhotoUrl] = useState(doctor.photoUrl ?? "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  function toggleDay(day: WeekDay, checked: boolean) {
    setDays((current) =>
      checked ? [...current, day] : current.filter((d) => d !== day)
    );
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateDoctorPhoto(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const url = await uploadDoctorPhoto(file);
      setPhotoUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function save() {
    startTransition(async () => {
      // specialty isn't collected here — it's derived from serviceSlug
      // server-side (see updateDoctor), not a second field to keep in sync.
      const result = await updateDoctor(doctor.id, {
        name,
        serviceSlug,
        availableDays: days,
        isActive,
        photoUrl,
      });
      if (result.error) {
        toast.error("Couldn't save", { description: result.error });
        return;
      }
      toast.success("Doctor updated");
    });
  }

  function link() {
    startTransition(async () => {
      const result = await linkDoctorAccount(doctor.id, email);
      if (result.error) {
        toast.error("Couldn't link account", { description: result.error });
        return;
      }
      toast.success(email.trim() ? "Account linked" : "Account unlinked");
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-ice-50">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt=""
                width={44}
                height={44}
                className="size-full object-cover"
              />
            ) : (
              <ImageUp className="size-4 text-slate-300" aria-hidden="true" />
            )}
          </div>
          <p className="font-display text-lg text-navy-900">{doctor.name}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {doctor.linkedEmail ? (
            <DoctorStatusBadge inClinic={doctor.inClinic} />
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
              No account linked
            </span>
          )}
          {!doctor.isActive && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-400/20">
              Retired
            </span>
          )}
        </div>
      </div>

      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-navy-900 transition-colors hover:bg-ice-50">
        {isUploadingPhoto ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImageUp className="size-4" />
        )}
        {isUploadingPhoto ? "Uploading…" : photoUrl ? "Replace photo" : "Upload photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
          disabled={isUploadingPhoto}
        />
      </label>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-navy-900">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-navy-900">Service</span>
          <Select value={serviceSlug} onValueChange={setServiceSlug}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {serviceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-navy-900">
          Available days
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2.5">
          {weekDays.map((day) => (
            <label key={day} className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox
                checked={days.includes(day)}
                onCheckedChange={(checked) => toggleDay(day, checked === true)}
              />
              {day.slice(0, 3)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 flex items-center gap-2.5 text-sm text-slate-700">
        <Checkbox
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        Accepting bookings
        <span className="text-slate-400">
          — unticking retires them without deleting past appointments
        </span>
      </label>

      <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-5">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium text-navy-900">Linked login account</span>
          <Input
            type="email"
            value={email}
            placeholder="doctor@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <Button variant="outline" onClick={link} disabled={isPending}>
          <Link2 className="size-4" />
          {email.trim() ? "Link account" : "Unlink"}
        </Button>
        <Button onClick={save} disabled={isPending || isUploadingPhoto}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving&hellip;
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save changes
            </>
          )}
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Linking an account grants clinic access and lets this doctor show as
        &ldquo;in clinic&rdquo; — their presence comes from their own sign-in
        activity. Unlinking reverts the account back to a plain client.
      </p>
    </div>
  );
}
