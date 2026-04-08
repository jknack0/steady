"use client";

import { Suspense } from "react";
import { Calendar } from "@/components/appointments/Calendar";
import { usePageTitle } from "@/hooks/use-page-title";

export default function AppointmentsPage() {
  usePageTitle("Calendar");
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
      <Calendar />
    </Suspense>
  );
}
