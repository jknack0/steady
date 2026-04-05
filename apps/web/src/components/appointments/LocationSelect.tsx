"use client";

import type { LocationRef } from "@/lib/appointment-types";

interface Props {
  locations: LocationRef[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function LocationSelect({ locations, value, onChange, disabled }: Props) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    >
      <option value="" disabled>
        Select a location
      </option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name} ({l.type === "VIRTUAL" ? "Telehealth" : "In person"})
        </option>
      ))}
    </select>
  );
}
