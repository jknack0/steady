"use client";

import { Users, BookOpen, UserCheck, Calendar } from "lucide-react";

interface PracticeTotals {
  clinicians: number;
  programs: number;
  publishedPrograms: number;
  enrollments: number;
  activeParticipants: number;
  upcomingAppointments: number;
}

export function PracticeStatsCards({ totals }: { totals: PracticeTotals }) {
  const cards = [
    {
      label: "Clinicians",
      value: totals.clinicians,
      icon: Users,
    },
    {
      label: "Programs",
      value: totals.programs,
      icon: BookOpen,
    },
    {
      label: "Active Clients",
      value: totals.activeParticipants,
      icon: UserCheck,
    },
    {
      label: "Upcoming Appointments",
      value: totals.upcomingAppointments,
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border bg-white p-5 flex items-start justify-between"
        >
          <div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
          </div>
          <card.icon className="h-5 w-5 text-muted-foreground/50" />
        </div>
      ))}
    </div>
  );
}
