import type { AppointmentStatus } from "@/lib/appointment-types";
import { appointmentStrings } from "@/lib/strings/appointments";

export interface StatusTheme {
  label: string;
  dot: string;
  border: string;
  bg: string;
  text: string;
  badge: string;
  icon?: string;
}

export const STATUS_THEME: Record<AppointmentStatus, StatusTheme> = {
  SCHEDULED: {
    label: appointmentStrings.statusScheduled,
    dot: "bg-blue-500",
    border: "border-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-900",
    badge: "bg-blue-100 text-blue-800",
  },
  ATTENDED: {
    label: appointmentStrings.statusAttended,
    dot: "bg-green-500",
    border: "border-green-500",
    bg: "bg-green-50",
    text: "text-green-900",
    badge: "bg-green-100 text-green-800",
  },
  NO_SHOW: {
    label: appointmentStrings.statusNoShow,
    dot: "bg-red-500",
    border: "border-red-500",
    bg: "bg-red-50",
    text: "text-red-900",
    badge: "bg-red-100 text-red-800",
  },
  LATE_CANCELED: {
    label: appointmentStrings.statusLateCanceled,
    dot: "bg-amber-500",
    border: "border-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-800",
  },
  CLIENT_CANCELED: {
    label: appointmentStrings.statusClientCanceled,
    dot: "bg-gray-500",
    border: "border-gray-500",
    bg: "bg-gray-50",
    text: "text-gray-900",
    badge: "bg-gray-100 text-gray-800",
  },
  CLINICIAN_CANCELED: {
    label: appointmentStrings.statusClinicianCanceled,
    dot: "bg-gray-500",
    border: "border-gray-500",
    bg: "bg-gray-50",
    text: "text-gray-900",
    badge: "bg-gray-100 text-gray-800",
    icon: "⊘",
  },
};

export const TERMINAL_STATUSES: AppointmentStatus[] = [
  "ATTENDED",
  "NO_SHOW",
  "LATE_CANCELED",
  "CLIENT_CANCELED",
  "CLINICIAN_CANCELED",
];

export function isTerminal(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
