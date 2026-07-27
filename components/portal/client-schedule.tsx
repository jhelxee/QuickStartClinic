"use client";

import { useState } from "react";

import type { AppointmentDefaults } from "@/components/forms/appointment-form";
import {
  ClientBookSlotDialog,
  type ClickedClientSlot,
} from "@/components/portal/client-book-slot-dialog";
import {
  WeeklyTimetable,
  type BookedSlot,
  type PatientSpecialtyGroup,
  type TimetableEntry,
} from "@/components/portal/weekly-timetable";
import type { WeekColumn } from "@/lib/schedule-data";

/**
 * Owns the click-to-book dialog's open/closed state, same pattern as
 * components/admin/staff-schedule.tsx — WeeklyTimetable stays a plain
 * rendering component, this is the one small client boundary around it.
 */
export function ClientSchedule({
  today,
  week,
  specialties,
  mine,
  booked,
  defaults,
}: {
  today: string;
  week: WeekColumn[];
  specialties: PatientSpecialtyGroup[];
  mine: TimetableEntry[];
  booked: BookedSlot[];
  defaults: AppointmentDefaults | null;
}) {
  const [slot, setSlot] = useState<ClickedClientSlot | null>(null);

  return (
    <>
      <WeeklyTimetable
        today={today}
        week={week}
        specialties={specialties}
        mine={mine}
        booked={booked}
        onCellClick={(clicked) => setSlot(clicked)}
      />
      <ClientBookSlotDialog
        slot={slot}
        defaults={defaults}
        onOpenChange={(open) => {
          if (!open) setSlot(null);
        }}
      />
    </>
  );
}
