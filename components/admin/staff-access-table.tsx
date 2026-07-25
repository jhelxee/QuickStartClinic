"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { setUserRole } from "@/app/actions/master-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/dal";
import { cn } from "@/lib/utils";

export interface AccessRow {
  id: string;
  email: string;
  legalName: string;
  role: Role;
  isSelf: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  client: "Client — family",
  staff: "Staff — coordinator",
  doctor: "Doctor — clinician",
  admin: "Admin — full control",
};

const ROLE_STYLES: Record<Role, string> = {
  client: "bg-slate-100 text-slate-600 ring-slate-400/20",
  staff: "bg-brand-blue-50 text-brand-blue-700 ring-brand-blue-600/20",
  doctor: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  admin: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

export function StaffAccessTable({ people }: { people: AccessRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="p-4 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Name
            </th>
            <th scope="col" className="p-4 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Email
            </th>
            <th scope="col" className="p-4 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Current
            </th>
            <th scope="col" className="p-4 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Change to
            </th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <AccessRowItem key={person.id} person={person} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccessRowItem({ person }: { person: AccessRow }) {
  const [isPending, startTransition] = useTransition();

  function change(role: string) {
    startTransition(async () => {
      const result = await setUserRole(person.id, role as Role);
      if (result.error) {
        toast.error("Couldn't change role", { description: result.error });
        return;
      }
      toast.success(`${person.legalName} is now ${role}`);
    });
  }

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="p-4 font-medium text-navy-900">
        {person.legalName}
        {person.isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
      </td>
      <td className="p-4 text-slate-700">{person.email}</td>
      <td className="p-4">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
            ROLE_STYLES[person.role]
          )}
        >
          {person.role}
        </span>
      </td>
      <td className="p-4">
        {person.isSelf ? (
          // The database refuses this too — guard_profile_update rejects any
          // role change where the target is the caller. Disabling it here just
          // avoids offering an action that would fail.
          <span className="text-xs text-slate-400">
            Ask another admin to change your role
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <Select value={person.role} onValueChange={change} disabled={isPending}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPending && (
              <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden="true" />
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
