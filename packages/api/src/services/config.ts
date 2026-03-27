import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { PROVIDER_PRESETS } from "@steady/shared";
import type { ClinicianConfig, ClientConfig } from "@prisma/client";

// ── Error Classes ─────────────────────────────────────

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// ── 1. Clinician Config ───────────────────────────────

export async function getClinicianConfig(
  clinicianProfileId: string
): Promise<ClinicianConfig | null> {
  return prisma.clinicianConfig.findUnique({
    where: { clinicianId: clinicianProfileId },
  });
}

export async function saveClinicianConfig(
  clinicianProfileId: string,
  data: {
    providerType: string;
    presetId?: string;
    primaryModality?: string;
    enabledModules: string[];
    dashboardLayout: Array<{ widgetId: string; visible: boolean; column?: string; order?: number; settings?: Record<string, unknown> }>;
    clientOverviewLayout?: Array<{ widgetId: string; visible: boolean; column?: string; order?: number; settings?: Record<string, unknown> }>;
    defaultTrackerPreset?: string;
    defaultAssessments?: Array<{ instrumentId: string; frequency: string }>;
    practiceName?: string;
    brandColor?: string;
  }
): Promise<ClinicianConfig> {
  return prisma.clinicianConfig.upsert({
    where: { clinicianId: clinicianProfileId },
    create: {
      clinicianId: clinicianProfileId,
      providerType: data.providerType as any,
      presetId: data.presetId || null,
      primaryModality: data.primaryModality || null,
      enabledModules: data.enabledModules,
      dashboardLayout: data.dashboardLayout as any,
      clientOverviewLayout: data.clientOverviewLayout ? (data.clientOverviewLayout as any) : undefined,
      defaultTrackerPreset: data.defaultTrackerPreset || null,
      defaultAssessments: data.defaultAssessments
        ? (data.defaultAssessments as any)
        : undefined,
      practiceName: data.practiceName || null,
      brandColor: data.brandColor || null,
      setupCompleted: true,
    },
    update: {
      providerType: data.providerType as any,
      presetId: data.presetId || null,
      primaryModality: data.primaryModality || null,
      enabledModules: data.enabledModules,
      dashboardLayout: data.dashboardLayout as any,
      clientOverviewLayout: data.clientOverviewLayout ? (data.clientOverviewLayout as any) : undefined,
      defaultTrackerPreset: data.defaultTrackerPreset || null,
      defaultAssessments: data.defaultAssessments
        ? (data.defaultAssessments as any)
        : undefined,
      practiceName: data.practiceName || null,
      brandColor: data.brandColor || null,
      setupCompleted: true,
    },
  });
}

export async function saveDashboardLayout(
  clinicianProfileId: string,
  data: {
    dashboardLayout?: Array<{ widgetId: string; visible: boolean; column: string; order: number; settings: Record<string, unknown> }>;
    clientOverviewLayout?: Array<{ widgetId: string; visible: boolean; column: string; order: number; settings: Record<string, unknown> }>;
  }
): Promise<ClinicianConfig> {
  const updateData: Record<string, unknown> = {};
  if (data.dashboardLayout) updateData.dashboardLayout = data.dashboardLayout;
  if (data.clientOverviewLayout) updateData.clientOverviewLayout = data.clientOverviewLayout;

  return prisma.clinicianConfig.update({
    where: { clinicianId: clinicianProfileId },
    data: updateData,
  });
}

export async function saveHomeworkLabels(
  clinicianProfileId: string,
  homeworkLabels: Record<string, string>
): Promise<ClinicianConfig> {
  return prisma.clinicianConfig.update({
    where: { clinicianId: clinicianProfileId },
    data: { homeworkLabels },
  });
}

export async function saveClientOverviewLayout(
  clientId: string,
  clinicianId: string,
  layout: Array<{ widgetId: string; visible: boolean; column: string; order: number; settings: Record<string, unknown> }>
): Promise<ClientConfig> {
  return prisma.clientConfig.upsert({
    where: {
      clientId_clinicianId: { clientId, clinicianId },
    },
    create: {
      clientId,
      clinicianId,
      clientOverviewLayout: layout as any,
    },
    update: {
      clientOverviewLayout: layout as any,
    },
  });
}

// ── 2. Client Config ──────────────────────────────────

export async function getClientConfig(
  clientId: string,
  clinicianId: string
): Promise<ClientConfig | null> {
  return prisma.clientConfig.findUnique({
    where: {
      clientId_clinicianId: { clientId, clinicianId },
    },
  });
}

export async function saveClientConfig(
  clientId: string,
  clinicianId: string,
  data: {
    enabledModules?: string[];
    activeTrackers?: string[];
    activeAssessments?: Array<{ instrumentId: string; frequency: string }>;
    activeMedications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      startDate?: string;
    }>;
    clientOverviewLayout?: Array<{ widgetId: string; visible: boolean; column?: string; order?: number; settings?: Record<string, unknown> }>;
  }
): Promise<ClientConfig> {
  return prisma.clientConfig.upsert({
    where: {
      clientId_clinicianId: { clientId, clinicianId },
    },
    create: {
      clientId,
      clinicianId,
      enabledModules: data.enabledModules ? (data.enabledModules as any) : undefined,
      activeTrackers: data.activeTrackers ? (data.activeTrackers as any) : undefined,
      activeAssessments: data.activeAssessments ? (data.activeAssessments as any) : undefined,
      activeMedications: data.activeMedications ? (data.activeMedications as any) : undefined,
      clientOverviewLayout: data.clientOverviewLayout ? (data.clientOverviewLayout as any) : undefined,
    },
    update: {
      enabledModules: data.enabledModules ? (data.enabledModules as any) : undefined,
      activeTrackers: data.activeTrackers ? (data.activeTrackers as any) : undefined,
      activeAssessments: data.activeAssessments ? (data.activeAssessments as any) : undefined,
      activeMedications: data.activeMedications ? (data.activeMedications as any) : undefined,
      clientOverviewLayout: data.clientOverviewLayout ? (data.clientOverviewLayout as any) : undefined,
    },
  });
}

// ── 3. Resolve Client Config (merge clinician + client) ─

export interface ResolvedConfig {
  enabledModules: string[];
  activeTrackers: string[];
  activeAssessments: Array<{ instrumentId: string; frequency: string }>;
  activeMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  branding: {
    color: string | null;
    practiceName: string | null;
    logoUrl: string | null;
  };
}

export async function resolveClientConfig(
  clientId: string,
  clinicianId: string
): Promise<ResolvedConfig> {
  const [clinicianConfig, clientConfig] = await Promise.all([
    prisma.clinicianConfig.findUnique({
      where: { clinicianId },
    }),
    prisma.clientConfig.findUnique({
      where: {
        clientId_clinicianId: { clientId, clinicianId },
      },
    }),
  ]);

  // Start with clinician defaults, client config overrides
  const enabledModules =
    (clientConfig?.enabledModules as string[] | null) ??
    (clinicianConfig?.enabledModules as string[] | null) ??
    [];

  const activeTrackers =
    (clientConfig?.activeTrackers as string[] | null) ??
    [];

  const activeAssessments =
    (clientConfig?.activeAssessments as Array<{
      instrumentId: string;
      frequency: string;
    }> | null) ??
    (clinicianConfig?.defaultAssessments as Array<{
      instrumentId: string;
      frequency: string;
    }> | null) ??
    [];

  const activeMedications =
    (clientConfig?.activeMedications as Array<{
      name: string;
      dosage: string;
      frequency: string;
    }> | null) ?? [];

  const branding = {
    color: clinicianConfig?.brandColor ?? null,
    practiceName: clinicianConfig?.practiceName ?? null,
    logoUrl: clinicianConfig?.practiceLogoUrl ?? null,
  };

  return {
    enabledModules,
    activeTrackers,
    activeAssessments,
    activeMedications,
    branding,
  };
}

// ── 4. Create Config from Preset ──────────────────────

export async function createDefaultConfig(
  clinicianProfileId: string,
  presetId: string
): Promise<ClinicianConfig> {
  const preset =
    PROVIDER_PRESETS[presetId as keyof typeof PROVIDER_PRESETS];

  if (!preset) {
    throw new NotFoundError(`Preset "${presetId}" not found`);
  }

  const enabledModules = [...preset.enabledModules] as string[];
  const dashboardLayout = [...preset.dashboardLayout];
  const clientOverviewLayout = [...preset.clientOverviewLayout];
  const defaultAssessments = preset.defaultAssessments.map(
    (instrumentId: string) => ({
      instrumentId,
      frequency: "MONTHLY" as const,
    })
  );

  return prisma.clinicianConfig.upsert({
    where: { clinicianId: clinicianProfileId },
    create: {
      clinicianId: clinicianProfileId,
      providerType: preset.providerType as any,
      presetId: preset.id,
      enabledModules,
      dashboardLayout: dashboardLayout as any,
      clientOverviewLayout: clientOverviewLayout as any,
      defaultTrackerPreset: preset.defaultTrackerPreset,
      defaultAssessments: defaultAssessments as any,
      setupCompleted: true,
    },
    update: {
      providerType: preset.providerType as any,
      presetId: preset.id,
      enabledModules,
      dashboardLayout: dashboardLayout as any,
      clientOverviewLayout: clientOverviewLayout as any,
      defaultTrackerPreset: preset.defaultTrackerPreset,
      defaultAssessments: defaultAssessments as any,
      setupCompleted: true,
    },
  });
}
