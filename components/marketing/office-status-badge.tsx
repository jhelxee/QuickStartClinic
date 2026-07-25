"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

function computeIsOpen(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 Sun ... 6 Sat
  const hour = now.getHours() + now.getMinutes() / 60;

  if (day >= 1 && day <= 5) return hour >= 8 && hour < 18;
  if (day === 6) return hour >= 9 && hour < 14;
  return false;
}

function subscribe() {
  return () => {};
}

function getSnapshot(): boolean {
  return computeIsOpen();
}

// Unknown until the client resolves the visitor's local time.
function getServerSnapshot(): boolean | null {
  return null;
}

export function OfficeStatusBadge() {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (isOpen === null) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      )}
    >
      <span className="relative flex size-1.5">
        {isOpen && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex size-1.5 rounded-full",
            isOpen ? "bg-emerald-500" : "bg-slate-400"
          )}
        />
      </span>
      {isOpen ? "Open now" : "Closed now"}
    </span>
  );
}
