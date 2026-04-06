import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  StatusChangeInput,
  ListAppointmentsQuery,
  AppointmentStatus,
  AppointmentType,
  CreateLocationInput,
  UpdateLocationInput,
  LocationType,
} from "@steady/shared";

export type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  StatusChangeInput,
  ListAppointmentsQuery,
  AppointmentStatus,
  AppointmentType,
  CreateLocationInput,
  UpdateLocationInput,
  LocationType,
};

export interface AppointmentParticipantRef {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface ServiceCodeRef {
  id: string;
  code: string;
  description: string;
  defaultDurationMinutes: number;
  defaultPriceCents?: number | null;
  isActive?: boolean;
}

export interface LocationRef {
  id: string;
  name: string;
  type: LocationType;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface AppointmentView {
  id: string;
  practiceId: string;
  clinicianId: string;
  participantId: string;
  participant: AppointmentParticipantRef | null;
  serviceCode: ServiceCodeRef | null;
  location: LocationRef | null;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  appointmentType: AppointmentType;
  internalNote: string | null;
  cancelReason: string | null;
  statusChangedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  invoiceId: string | null;
}

export interface AppointmentWithConflicts {
  appointment: AppointmentView;
  conflicts: string[];
}

export interface ParticipantSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}
