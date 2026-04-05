"use client";

import { Suspense } from "react";
import { Calendar } from "@/components/appointments/Calendar";

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <Calendar />
    </Suspense>
  );
}
