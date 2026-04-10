"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// ── Response types ──────────────────────────────────────────────────────────

export interface RtmDashboardSummary {
  totalActiveClients: number;
  clientsBillable: number;
  clientsApproaching: number;
  clientsAtRisk: number;
  estimatedRevenue: number;
  totalMonitoringMinutes: number;
}

export interface RtmClientRow {
  rtmEnrollmentId: string;
  clientId: string;
  clientName: string;
  currentPeriod: {
    id: string;
    periodStart: string;
    periodEnd: string;
    engagementDays: number;
    clinicianMinutes: number;
    hasInteractiveCommunication: boolean;
    interactiveCommunicationDate: string | null;
    status: string;
    billingTier: string;
    eligibleCodes: string[];
    daysRemaining: number;
    daysElapsed: number;
  } | null;
  lastEngagementDate: string | null;
}

export interface RtmDashboardData {
  summary: RtmDashboardSummary;
  clients: RtmClientRow[];
}

export interface EngagementEvent {
  date: string;
  events: Array<{ type: string; timestamp: string }>;
}

export interface TimeLogEntry {
  id: string;
  activityDate: string;
  activityType: string;
  durationMinutes: number;
  description: string | null;
  isInteractiveCommunication: boolean;
}

export interface PreviousPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  engagementDays: number;
  clinicianMinutes: number;
  status: string;
  billingTier: string;
  eligibleCodes: string[];
}

export interface RtmClientDetail {
  rtmEnrollmentId: string;
  clientId: string;
  clientName: string;
  monitoringType: string;
  enrollmentStatus: string;
  enrolledAt: string;
  currentPeriod: RtmClientRow["currentPeriod"];
  engagementCalendar: EngagementEvent[];
  timeLogs: TimeLogEntry[];
  previousPeriods: PreviousPeriod[];
}

export interface RtmEnrollment {
  id: string;
  clientId: string;
  clientName: string;
  monitoringType: string;
  status: string;
  enrolledAt: string;
}

export interface BillingProfile {
  id: string;
  clinicianId: string;
  providerName: string;
  credentials: string;
  npiNumber: string;
  taxId: string;
  practiceName: string;
  practiceAddress: string;
  practiceCity: string;
  practiceState: string;
  practiceZip: string;
  practicePhone: string;
  licenseNumber: string;
  licenseState: string;
  placeOfServiceCode: string;
  createdAt: string;
  updatedAt: string;
}

// ── Query hooks ─────────────────────────────────────────────────────────────

export function useRtmDashboard(enabled = true) {
  return useQuery<RtmDashboardData>({
    queryKey: queryKeys.rtm.dashboard,
    queryFn: () => api.get("/api/rtm/dashboard"),
    enabled,
  });
}

export function useRtmClientDetail(enrollmentId: string) {
  return useQuery<RtmClientDetail>({
    queryKey: queryKeys.rtm.detail(enrollmentId),
    queryFn: () => api.get(`/api/rtm/enrollments/${enrollmentId}/detail`),
    enabled: !!enrollmentId,
  });
}

export function useRtmEnrollments() {
  return useQuery<RtmEnrollment[]>({
    queryKey: queryKeys.rtm.enrollments,
    queryFn: () => api.get("/api/rtm/enrollments"),
  });
}

export function useBillingProfile() {
  return useQuery<BillingProfile>({
    queryKey: queryKeys.billing.profile,
    queryFn: () => api.get("/api/rtm/billing-profile"),
  });
}

// ── Mutation hooks ──────────────────────────────────────────────────────────

export function useCreateRtmEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientId: string;
      enrollmentId?: string;
      monitoringType?: string;
      diagnosisCodes: string[];
      payerName: string;
      subscriberId: string;
      groupNumber?: string;
      startDate: string;
    }) => api.post("/api/rtm", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rtm.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.rtm.enrollments });
    },
  });
}

export function useEndRtmEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) =>
      api.post(`/api/rtm/enrollments/${enrollmentId}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rtm.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.rtm.enrollments });
      queryClient.invalidateQueries({ queryKey: ["rtm-detail"] /* partial match for broad invalidation */ });
    },
  });
}

export function useLogRtmTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      rtmEnrollmentId: string;
      durationMinutes: number;
      activityType: string;
      description?: string;
      isInteractiveCommunication?: boolean;
    }) => api.post("/api/rtm/time", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rtm.dashboard });
      queryClient.invalidateQueries({ queryKey: ["rtm-detail"] /* partial match for broad invalidation */ });
    },
  });
}

export function useUpdateBillingPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string } }) =>
      api.patch(`/api/rtm/periods/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rtm.dashboard });
      queryClient.invalidateQueries({ queryKey: ["rtm-detail"] /* partial match for broad invalidation */ });
      queryClient.invalidateQueries({ queryKey: queryKeys.rtm.enrollments });
    },
  });
}

export function useRecalculatePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodId: string) =>
      api.post(`/api/rtm/periods/${periodId}/recalculate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rtm.dashboard });
      queryClient.invalidateQueries({ queryKey: ["rtm-detail"] /* partial match for broad invalidation */ });
      queryClient.invalidateQueries({ queryKey: queryKeys.rtm.enrollments });
    },
  });
}

export interface SuperbillData {
  provider: {
    name: string;
    credentials: string;
    npi: string;
    taxId: string;
    practiceName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    licenseNumber: string;
    licenseState: string;
    placeOfService: string;
  };
  client: {
    name: string;
  };
  insurance: {
    payerName: string;
    subscriberId: string;
    groupNumber: string | null;
  };
  period: {
    startDate: string;
    endDate: string;
    engagementDays: number;
    clinicianMinutes: number;
    hasInteractiveCommunication: boolean;
    interactiveCommunicationDate: string | null;
  };
  diagnosisCodes: string[];
  lineItems: Array<{
    dateOfService: string;
    cptCode: string;
    description: string;
    units: number;
    chargeAmount: number;
    diagnosisPointer: string;
    modifier: string | null;
  }>;
  totalCharges: number;
  generatedAt: string;
  billingPeriodId: string;
}

export function useSuperbillData(periodId: string) {
  return useQuery<SuperbillData>({
    queryKey: queryKeys.rtm.superbill(periodId),
    queryFn: () => api.get(`/api/rtm/periods/${periodId}/superbill`),
    enabled: !!periodId,
  });
}

export type SaveBillingProfileData = Omit<BillingProfile, "id" | "clinicianId" | "createdAt" | "updatedAt">;

export function useSaveBillingProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveBillingProfileData) =>
      api.put("/api/rtm/billing-profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.profile });
    },
  });
}
