"use client";

import type { ServiceCodeRef } from "@/lib/appointment-types";

interface Props {
  codes: ServiceCodeRef[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ServiceCodeSelect({ codes, value, onChange, disabled }: Props) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    >
      <option value="" disabled>
        Select a service code
      </option>
      {codes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.code} — {c.description} ({c.defaultDurationMinutes} min)
        </option>
      ))}
    </select>
  );
}
