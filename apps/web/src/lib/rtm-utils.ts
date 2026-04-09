import { CPT_CODES } from "@steady/shared";
import { formatShortDate, formatMoney } from "@/lib/format";

const CPT_INFO: Record<string, { description: string; rate: number }> = CPT_CODES;

export interface BillabilityItem {
  label: string;
  status: "done" | "warning" | "missing";
  detail: string;
  shortDetail: string;
  action?: { label: string; minutes?: number; interactive?: boolean };
}

export interface BillabilityResult {
  items: BillabilityItem[];
  eligibleCodes: string[];
  missingCodes: Array<{ code: string; reason: string }>;
  potentialRevenue: number;
}

export interface BillingPeriodData {
  engagementDays: number;
  clinicianMinutes: number;
  hasInteractiveCommunication: boolean;
  interactiveCommunicationDate?: string | null;
  eligibleCodes: string[];
}

export function computeBillability(period: BillingPeriodData | null | undefined): BillabilityResult {
  if (!period) return { items: [], eligibleCodes: [], missingCodes: [], potentialRevenue: 0 };

  const items: BillabilityItem[] = [];
  const eligibleCodes = [...period.eligibleCodes];
  const missingCodes: Array<{ code: string; reason: string }> = [];

  // Engagement days
  const engagementMet = period.engagementDays >= 16;
  items.push({
    label: "Engagement Days",
    status: engagementMet ? "done" : period.engagementDays >= 12 ? "warning" : "missing",
    detail: `${period.engagementDays}/16 required (30-day total: ${period.engagementDays}/30)`,
    shortDetail: engagementMet ? "DONE" : `${16 - period.engagementDays} MORE DAYS`,
  });

  // Monitoring time
  const minutesMet = period.clinicianMinutes >= 20;
  const minutesPartial = period.clinicianMinutes >= 10;
  items.push({
    label: "Monitoring Time",
    status: minutesMet ? "done" : minutesPartial ? "warning" : "missing",
    detail: `${period.clinicianMinutes}/20 minutes required`,
    shortDetail: minutesMet ? "DONE" : `${20 - period.clinicianMinutes} MORE MIN`,
    action: minutesMet
      ? undefined
      : {
          label: `Log ${20 - period.clinicianMinutes} min`,
          minutes: 20 - period.clinicianMinutes,
        },
  });

  // Interactive communication
  items.push({
    label: "Live Interaction",
    status: period.hasInteractiveCommunication ? "done" : "missing",
    detail: period.hasInteractiveCommunication
      ? `Recorded${period.interactiveCommunicationDate ? ` on ${formatShortDate(period.interactiveCommunicationDate)}` : ""}`
      : "Not recorded yet",
    shortDetail: period.hasInteractiveCommunication ? "DONE" : "REQUIRED",
    action: period.hasInteractiveCommunication
      ? undefined
      : { label: "Log Interaction", interactive: true },
  });

  // Determine missing codes
  if (!eligibleCodes.includes("98978") && !eligibleCodes.includes("98986")) {
    if (!engagementMet) {
      missingCodes.push({ code: "98978", reason: `needs ${16 - period.engagementDays} more engagement days` });
    }
  }
  if (!eligibleCodes.includes("98980")) {
    const reasons: string[] = [];
    if (!minutesMet) reasons.push(`${20 - period.clinicianMinutes} more min`);
    if (!period.hasInteractiveCommunication) reasons.push("live interaction");
    if (reasons.length > 0) {
      missingCodes.push({ code: "98980", reason: `needs ${reasons.join(" + ")}` });
    }
  }

  // Revenue
  let potentialRevenue = 0;
  const allPotentialCodes = [...new Set([...eligibleCodes, ...missingCodes.map((m) => m.code)])];
  for (const code of allPotentialCodes) {
    if (CPT_INFO[code]) potentialRevenue += CPT_INFO[code].rate;
  }

  return { items, eligibleCodes, missingCodes, potentialRevenue };
}
