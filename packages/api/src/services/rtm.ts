import { logger } from "../lib/logger";
import { prisma } from "@steady/db";
import { getCptRate } from "@steady/shared";
import type {
  RtmEventType,
  RtmEnrollment,
  RtmBillingPeriod,
  RtmClinicianTimeLog,
} from "@prisma/client";

// ── Error Classes ─────────────────────────────────────

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// ── 1. Engagement Event Logging (fire-and-forget) ─────

export async function logRtmEngagement(
  userId: string,
  eventType: RtmEventType,
  enrollmentId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const now = new Date();
    const eventDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    await prisma.rtmEngagementEvent.create({
      data: {
        userId,
        eventType,
        eventDate,
        enrollmentId: enrollmentId || null,
        metadata: metadata || undefined,
      },
    });
  } catch (err) {
    logger.error("Failed to log RTM engagement event", err);
  }
}

// ── 2. RTM Enrollment ─────────────────────────────────

export async function createRtmEnrollment(data: {
  clinicianId: string;
  clientId: string;
  enrollmentId?: string;
  monitoringType?: string;
  diagnosisCodes: string[];
  payerName: string;
  subscriberId: string;
  groupNumber?: string;
  startDate: string;
}): Promise<RtmEnrollment> {
  // Check for existing active enrollment with this clinician
  const existing = await prisma.rtmEnrollment.findFirst({
    where: {
      clinicianId: data.clinicianId,
      clientId: data.clientId,
      status: { in: ["PENDING_CONSENT", "ACTIVE"] },
    },
  });

  if (existing) {
    throw new ConflictError(
      "Client already has an active RTM enrollment with this clinician"
    );
  }

  const startDate = new Date(data.startDate);
  const periodEnd = new Date(startDate);
  periodEnd.setDate(periodEnd.getDate() + 30);

  return prisma.$transaction(async (tx) => {
    const rtmEnrollment = await tx.rtmEnrollment.create({
      data: {
        clinicianId: data.clinicianId,
        clientId: data.clientId,
        enrollmentId: data.enrollmentId || null,
        monitoringType: (data.monitoringType as any) || "CBT",
        diagnosisCodes: data.diagnosisCodes,
        payerName: data.payerName,
        subscriberId: data.subscriberId,
        groupNumber: data.groupNumber || null,
        status: "PENDING_CONSENT",
        startDate,
      },
    });

    await tx.rtmBillingPeriod.create({
      data: {
        rtmEnrollmentId: rtmEnrollment.id,
        clinicianId: data.clinicianId,
        clientId: data.clientId,
        enrollmentId: data.enrollmentId || null,
        periodStart: startDate,
        periodEnd,
        status: "ACTIVE",
      },
    });

    return rtmEnrollment;
  });
}

export async function recordRtmConsent(
  rtmEnrollmentId: string,
  signatureName: string,
  consentDocumentUrl?: string
): Promise<void> {
  await prisma.rtmEnrollment.update({
    where: { id: rtmEnrollmentId },
    data: {
      consentSignedAt: new Date(),
      status: "ACTIVE",
      ...(consentDocumentUrl ? { consentDocumentUrl } : {}),
    },
  });
}

export async function endRtmEnrollment(
  rtmEnrollmentId: string
): Promise<void> {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  await prisma.$transaction(async (tx) => {
    await tx.rtmEnrollment.update({
      where: { id: rtmEnrollmentId },
      data: {
        status: "ENDED",
        endDate: today,
      },
    });

    await tx.rtmBillingPeriod.updateMany({
      where: {
        rtmEnrollmentId,
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
      },
    });
  });
}

// ── 3. Billing Period Management ──────────────────────

export async function recalculateBillingPeriod(
  periodId: string
): Promise<RtmBillingPeriod> {
  const period = await prisma.rtmBillingPeriod.findUnique({
    where: { id: periodId },
    include: {
      rtmEnrollment: true,
    },
  });

  if (!period) {
    throw new NotFoundError("Billing period not found");
  }

  // Count unique engagement days for this client within the period date range
  const engagementEvents = await prisma.rtmEngagementEvent.findMany({
    where: {
      userId: period.clientId,
      eventDate: {
        gte: period.periodStart,
        lte: period.periodEnd,
      },
      OR: [
        { enrollmentId: period.enrollmentId },
        { enrollmentId: null },
      ],
    },
    select: { eventDate: true },
  });

  const uniqueDates = new Set(
    engagementEvents.map((e) => e.eventDate.toISOString().split("T")[0])
  );
  const engagementDays = uniqueDates.size;

  // Sum clinician time logs for this period
  const timeLogs = await prisma.rtmClinicianTimeLog.findMany({
    where: { billingPeriodId: periodId },
    select: {
      durationMinutes: true,
      isInteractiveCommunication: true,
      activityDate: true,
    },
  });

  const clinicianMinutes = timeLogs.reduce(
    (sum, log) => sum + log.durationMinutes,
    0
  );
  const hasInteractiveCommunication = timeLogs.some(
    (log) => log.isInteractiveCommunication
  );
  const interactiveLog = timeLogs.find(
    (log) => log.isInteractiveCommunication
  );
  const interactiveCommunicationDate = interactiveLog
    ? interactiveLog.activityDate
    : null;

  // Compute billing tier
  let billingTier: "NONE" | "SHORT_PERIOD" | "FULL_PERIOD";
  if (engagementDays < 2) {
    billingTier = "NONE";
  } else if (engagementDays >= 2 && engagementDays <= 15) {
    billingTier = "SHORT_PERIOD";
  } else {
    billingTier = "FULL_PERIOD";
  }

  // Check if this is the first billing period for this enrollment (for 98975)
  const firstPeriod = await prisma.rtmBillingPeriod.findFirst({
    where: { rtmEnrollmentId: period.rtmEnrollmentId },
    orderBy: { periodStart: "asc" },
    select: { id: true },
  });
  const isFirstPeriod = firstPeriod?.id === periodId;

  // Compute eligible CPT codes
  const eligibleCodes: string[] = [];

  // 98975: first period only, one-time setup
  if (isFirstPeriod) {
    eligibleCodes.push("98975");
  }

  // 98978: engagementDays >= 16
  if (engagementDays >= 16) {
    eligibleCodes.push("98978");
  }

  // 98986: engagementDays >= 2 AND < 16
  if (engagementDays >= 2 && engagementDays < 16) {
    eligibleCodes.push("98986");
  }

  // 98980: clinicianMinutes >= 20 AND hasInteractiveCommunication
  if (clinicianMinutes >= 20 && hasInteractiveCommunication) {
    eligibleCodes.push("98980");
  }

  // 98979: clinicianMinutes >= 10 AND < 20 AND hasInteractiveCommunication
  if (
    clinicianMinutes >= 10 &&
    clinicianMinutes < 20 &&
    hasInteractiveCommunication
  ) {
    eligibleCodes.push("98979");
  }

  // 98981: for each additional 20 min beyond 20 — only if 98980 qualifies
  if (clinicianMinutes >= 20 && hasInteractiveCommunication) {
    const additionalUnits = Math.floor((clinicianMinutes - 20) / 20);
    for (let i = 0; i < additionalUnits; i++) {
      eligibleCodes.push("98981");
    }
  }

  // Determine new status
  let newStatus = period.status;
  if (billingTier === "FULL_PERIOD" && period.status === "ACTIVE") {
    newStatus = "THRESHOLD_MET";
  }

  const updated = await prisma.rtmBillingPeriod.update({
    where: { id: periodId },
    data: {
      engagementDays,
      clinicianMinutes,
      hasInteractiveCommunication,
      interactiveCommunicationDate,
      billingTier,
      eligibleCodes,
      status: newStatus,
    },
  });

  return updated;
}

export async function rolloverBillingPeriods(): Promise<void> {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const expiredPeriods = await prisma.rtmBillingPeriod.findMany({
    where: {
      status: "ACTIVE",
      periodEnd: { lt: today },
    },
    include: {
      rtmEnrollment: { select: { id: true, status: true, clinicianId: true, clientId: true, enrollmentId: true } },
    },
  });

  for (const period of expiredPeriods) {
    // Recalculate metrics one final time
    const recalculated = await recalculateBillingPeriod(period.id);

    if (recalculated.engagementDays === 0) {
      await prisma.rtmBillingPeriod.update({
        where: { id: period.id },
        data: { status: "EXPIRED" },
      });
    }

    // Only create next period if enrollment is still ACTIVE
    if (period.rtmEnrollment.status === "ACTIVE") {
      const nextStart = new Date(period.periodEnd);
      nextStart.setDate(nextStart.getDate() + 1);

      const nextEnd = new Date(nextStart);
      nextEnd.setDate(nextEnd.getDate() + 29);

      await prisma.rtmBillingPeriod.create({
        data: {
          rtmEnrollmentId: period.rtmEnrollment.id,
          clinicianId: period.rtmEnrollment.clinicianId,
          clientId: period.rtmEnrollment.clientId,
          enrollmentId: period.rtmEnrollment.enrollmentId,
          periodStart: nextStart,
          periodEnd: nextEnd,
          status: "ACTIVE",
        },
      });
    }
  }

  logger.info(`Rolled over ${expiredPeriods.length} billing periods`);
}

// ── 4. Clinician Time Logging ─────────────────────────

export async function logClinicianTime(data: {
  billingPeriodId: string;
  clinicianId: string;
  activityType: string;
  durationMinutes: number;
  description: string;
  activityDate: string;
  isInteractiveCommunication: boolean;
}): Promise<void> {
  const period = await prisma.rtmBillingPeriod.findUnique({
    where: { id: data.billingPeriodId },
    select: { clientId: true },
  });

  if (!period) {
    throw new NotFoundError("Billing period not found");
  }

  await prisma.rtmClinicianTimeLog.create({
    data: {
      billingPeriodId: data.billingPeriodId,
      clinicianId: data.clinicianId,
      clientId: period.clientId,
      activityType: data.activityType as any,
      durationMinutes: data.durationMinutes,
      description: data.description,
      activityDate: new Date(data.activityDate),
      isInteractiveCommunication: data.isInteractiveCommunication,
    },
  });

  await recalculateBillingPeriod(data.billingPeriodId);
}

// ── 5. Dashboard Queries ──────────────────────────────

export async function getRtmDashboard(clinicianId: string): Promise<{
  summary: {
    totalActiveClients: number;
    clientsBillable: number;
    clientsApproaching: number;
    clientsAtRisk: number;
    estimatedRevenue: number;
    totalMonitoringMinutes: number;
  };
  clients: Array<{
    rtmEnrollmentId: string;
    clientId: string;
    clientName: string;
    currentPeriod: {
      id: string;
      periodStart: Date;
      periodEnd: Date;
      engagementDays: number;
      clinicianMinutes: number;
      hasInteractiveCommunication: boolean;
      interactiveCommunicationDate: Date | null;
      billingTier: string;
      status: string;
      eligibleCodes: unknown;
      daysRemaining: number;
      daysElapsed: number;
    } | null;
    lastEngagementDate: string | null;
  }>;
}> {
  const enrollments = await prisma.rtmEnrollment.findMany({
    where: {
      clinicianId,
      status: { in: ["ACTIVE", "PENDING_CONSENT"] },
    },
    include: {
      client: {
        select: { id: true, firstName: true, lastName: true },
      },
      billingPeriods: {
        orderBy: { periodStart: "desc" },
        take: 5,
      },
    },
  });

  // Batch-fetch last engagement date per client
  const clientIds = enrollments.map((e) => e.clientId);
  const lastEngagementEvents = clientIds.length > 0
    ? await prisma.rtmEngagementEvent.findMany({
        where: { userId: { in: clientIds } },
        orderBy: { eventDate: "desc" },
        distinct: ["userId"],
        select: { userId: true, eventDate: true },
      })
    : [];
  const lastEngagementMap = new Map(
    lastEngagementEvents.map((e) => [e.userId, e.eventDate.toISOString().split("T")[0]])
  );

  let clientsBillable = 0;
  let clientsApproaching = 0;
  let clientsAtRisk = 0;
  let estimatedRevenue = 0;
  let totalMonitoringMinutes = 0;

  const clients = enrollments.map((enrollment) => {
    const currentPeriod =
      enrollment.billingPeriods.find((p) => p.status === "ACTIVE" || p.status === "THRESHOLD_MET") ||
      enrollment.billingPeriods[0] ||
      null;

    if (currentPeriod) {
      totalMonitoringMinutes += currentPeriod.clinicianMinutes;

      const codes = (currentPeriod.eligibleCodes as string[]) || [];
      for (const code of codes) {
        estimatedRevenue += getCptRate(code);
      }

      const now = new Date();
      const start = new Date(currentPeriod.periodStart);
      const end = new Date(currentPeriod.periodEnd);
      const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
      const daysRemaining = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 86400000));
      const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000));
      const periodHalfElapsed = daysElapsed > totalDays * 0.5;

      if (
        currentPeriod.billingTier === "FULL_PERIOD" ||
        currentPeriod.status === "THRESHOLD_MET"
      ) {
        clientsBillable++;
      } else if (
        (currentPeriod.engagementDays >= 12 && currentPeriod.engagementDays <= 15) ||
        (currentPeriod.clinicianMinutes >= 10 && currentPeriod.clinicianMinutes <= 19)
      ) {
        clientsApproaching++;
      } else if (currentPeriod.engagementDays < 12 && periodHalfElapsed) {
        clientsAtRisk++;
      }
    } else {
      clientsAtRisk++;
    }

    const lastEngagementDate = lastEngagementMap.get(enrollment.clientId) || null;

    if (currentPeriod) {
      const now = new Date();
      const start = new Date(currentPeriod.periodStart);
      const end = new Date(currentPeriod.periodEnd);
      const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
      const daysRemaining = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 86400000));

      return {
        rtmEnrollmentId: enrollment.id,
        clientId: enrollment.clientId,
        clientName:
          `${enrollment.client.firstName} ${enrollment.client.lastName}`.trim(),
        currentPeriod: {
          id: currentPeriod.id,
          periodStart: currentPeriod.periodStart,
          periodEnd: currentPeriod.periodEnd,
          engagementDays: currentPeriod.engagementDays,
          clinicianMinutes: currentPeriod.clinicianMinutes,
          hasInteractiveCommunication: currentPeriod.hasInteractiveCommunication,
          interactiveCommunicationDate: currentPeriod.interactiveCommunicationDate,
          billingTier: currentPeriod.billingTier,
          status: currentPeriod.status,
          eligibleCodes: currentPeriod.eligibleCodes,
          daysRemaining,
          daysElapsed,
        },
        lastEngagementDate,
      };
    }

    return {
      rtmEnrollmentId: enrollment.id,
      clientId: enrollment.clientId,
      clientName:
        `${enrollment.client.firstName} ${enrollment.client.lastName}`.trim(),
      currentPeriod: null,
      lastEngagementDate,
    };
  });

  return {
    summary: {
      totalActiveClients: enrollments.length,
      clientsBillable,
      clientsApproaching,
      clientsAtRisk,
      estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
      totalMonitoringMinutes,
    },
    clients,
  };
}

export async function getRtmClientDetail(
  rtmEnrollmentId: string,
  clinicianId: string
): Promise<{
  enrollment: RtmEnrollment;
  currentPeriod: RtmBillingPeriod | null;
  engagementCalendar: Array<{
    date: string;
    events: Array<{ type: string; timestamp: string }>;
  }>;
  timeLogs: RtmClinicianTimeLog[];
  previousPeriods: RtmBillingPeriod[];
}> {
  const enrollment = await prisma.rtmEnrollment.findUnique({
    where: { id: rtmEnrollmentId },
  });

  if (!enrollment) {
    throw new NotFoundError("RTM enrollment not found");
  }

  if (enrollment.clinicianId !== clinicianId) {
    throw new NotFoundError("RTM enrollment not found");
  }

  // Get current (most recent ACTIVE) billing period with time logs
  const currentPeriod = await prisma.rtmBillingPeriod.findFirst({
    where: {
      rtmEnrollmentId,
      status: { in: ["ACTIVE", "THRESHOLD_MET"] },
    },
    orderBy: { periodStart: "desc" },
  });

  // Get time logs for current period
  let timeLogs: RtmClinicianTimeLog[] = [];
  if (currentPeriod) {
    timeLogs = await prisma.rtmClinicianTimeLog.findMany({
      where: { billingPeriodId: currentPeriod.id },
      orderBy: { activityDate: "desc" },
    });
  }

  // Get engagement events for current period, grouped by date
  let engagementCalendar: Array<{
    date: string;
    events: Array<{ type: string; timestamp: string }>;
  }> = [];

  if (currentPeriod) {
    const events = await prisma.rtmEngagementEvent.findMany({
      where: {
        userId: enrollment.clientId,
        eventDate: {
          gte: currentPeriod.periodStart,
          lte: currentPeriod.periodEnd,
        },
        OR: [
          { enrollmentId: enrollment.enrollmentId },
          { enrollmentId: null },
        ],
      },
      orderBy: { eventDate: "asc" },
    });

    const dateMap = new Map<
      string,
      Array<{ type: string; timestamp: string }>
    >();
    for (const event of events) {
      const dateKey = event.eventDate.toISOString().split("T")[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push({
        type: event.eventType,
        timestamp: event.eventTimestamp.toISOString(),
      });
    }

    engagementCalendar = Array.from(dateMap.entries()).map(
      ([date, events]) => ({
        date,
        events,
      })
    );
  }

  // Get previous billing periods (not ACTIVE)
  const previousPeriods = await prisma.rtmBillingPeriod.findMany({
    where: {
      rtmEnrollmentId,
      status: { notIn: ["ACTIVE"] },
      ...(currentPeriod ? { id: { not: currentPeriod.id } } : {}),
    },
    orderBy: { periodStart: "desc" },
  });

  return {
    enrollment,
    currentPeriod,
    engagementCalendar,
    timeLogs,
    previousPeriods,
  };
}

// ── 6. Recalculate All Active Periods (nightly job) ───

export async function recalculateAllActivePeriods(): Promise<void> {
  const activePeriods = await prisma.rtmBillingPeriod.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  for (const period of activePeriods) {
    try {
      await recalculateBillingPeriod(period.id);
    } catch (err) {
      logger.error(
        `Failed to recalculate billing period ${period.id}`,
        err
      );
    }
  }

  logger.info(
    `Recalculated ${activePeriods.length} active billing periods`
  );
}
