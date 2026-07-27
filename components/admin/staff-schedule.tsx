"use client";

import { useState } from "react";

import { BookSlotDialog, type ClickedSlot } from "@/components/admin/book-slot-dialog";
import { StaffTimetable, type SpecialtyGroup } from "@/components/admin/staff-timetable";
import type { WeekColumn } from "@/lib/schedule-data";

/**
 * Owns the click-to-book dialog's open/closed state so StaffTimetable (a
 * plain rendering component) and BookSlotDialog can share it without either
 * of them needing to be a server component's direct child for state to work.
 */
export function StaffSchedule({
  today,
  week,
  specialties,
}: {
  today: string;
  week: WeekColumn[];
  specialties: SpecialtyGroup[];
}) {
  const [slot, setSlot] = useState<ClickedSlot | null>(null);

  return (
    <>
      <StaffTimetable
        today={today}
        week={week}
        specialties={specialties}
        onCellClick={(clicked) => setSlot(clicked)}
      />
      <BookSlotDialog
        slot={slot}
        onOpenChange={(open) => {
          if (!open) setSlot(null);
        }}
      />
    </>
  );
}
