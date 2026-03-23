import { logger } from "../lib/logger";
import { prisma } from "@steady/db";
import { NotFoundError } from "./rtm";

// CPT code descriptions and default rates
const CPT_CODES: Record<string, { description: string; rate: number }> = {
  "98975": {
    description: "RTM initial setup and patient education",
    rate: 19.65,
  },
  "98978": {
    description:
      "RTM device supply with scheduled recordings, each 30 days (CBT)",
    rate: 55.0,
  },
  "98986": {
    description:
      "RTM device supply with scheduled recordings, 2-15 days (CBT)",
    rate: 50.0,
  },
  "98980": {
    description: "RTM treatment management, first 20 minutes",
    rate: 54.0,
  },
  "98979": {
    description: "RTM treatment management, 10-19 minutes",
    rate: 26.0,
  },
  "98981": {
    description: "RTM treatment management, each additional 20 minutes",
    rate: 41.0,
  },
};

export interface SuperbillData {
  // Provider info
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
  // Client info
  client: {
    name: string;
  };
  // Insurance info
  insurance: {
    payerName: string;
    subscriberId: string;
    groupNumber: string | null;
  };
  // Billing period
  period: {
    startDate: string;
    endDate: string;
    engagementDays: number;
    clinicianMinutes: number;
    hasInteractiveCommunication: boolean;
    interactiveCommunicationDate: string | null;
  };
  // Diagnosis codes
  diagnosisCodes: string[];
  // Line items
  lineItems: Array<{
    dateOfService: string;
    cptCode: string;
    description: string;
    units: number;
    chargeAmount: number;
    diagnosisPointer: string;
    modifier: string | null;
  }>;
  // Totals
  totalCharges: number;
  // Metadata
  generatedAt: string;
  billingPeriodId: string;
}

export async function generateSuperbillData(
  billingPeriodId: string,
  clinicianId: string
): Promise<SuperbillData> {
  // 1. Fetch billing period with enrollment data
  const period = await prisma.rtmBillingPeriod.findUnique({
    where: { id: billingPeriodId },
    include: {
      rtmEnrollment: true,
    },
  });

  if (!period) {
    throw new NotFoundError("Billing period not found");
  }

  if (period.clinicianId !== clinicianId) {
    throw new NotFoundError("Billing period not found");
  }

  // 2. Fetch clinician billing profile
  const billingProfile = await prisma.clinicianBillingProfile.findUnique({
    where: { clinicianId },
  });

  if (!billingProfile) {
    throw new NotFoundError(
      "Billing profile not set up. Please configure your billing profile before generating a superbill."
    );
  }

  // 3. Fetch client user for name
  const client = await prisma.user.findUnique({
    where: { id: period.clientId },
    select: { firstName: true, lastName: true },
  });

  if (!client) {
    throw new NotFoundError("Client not found");
  }

  const enrollment = period.rtmEnrollment;
  const eligibleCodes = (period.eligibleCodes as string[]) || [];
  const isTelehealth = billingProfile.placeOfServiceCode === "02";
  const periodEndStr = period.periodEnd.toISOString().split("T")[0];
  const interactiveDateStr = period.interactiveCommunicationDate
    ? period.interactiveCommunicationDate.toISOString().split("T")[0]
    : null;

  // 4. Build line items from eligible codes
  const lineItems: SuperbillData["lineItems"] = [];

  // Count occurrences of each code (98981 can appear multiple times)
  const codeCounts = new Map<string, number>();
  for (const code of eligibleCodes) {
    codeCounts.set(code, (codeCounts.get(code) || 0) + 1);
  }

  for (const [code, units] of codeCounts) {
    const cptInfo = CPT_CODES[code];
    if (!cptInfo) continue;

    // Device supply codes use periodEnd as date of service
    // Management codes use interactiveCommunicationDate
    const isDeviceSupplyCode = ["98975", "98978", "98986"].includes(code);
    const dateOfService = isDeviceSupplyCode
      ? periodEndStr
      : interactiveDateStr || periodEndStr;

    lineItems.push({
      dateOfService,
      cptCode: code,
      description: cptInfo.description,
      units,
      chargeAmount: Math.round(cptInfo.rate * units * 100) / 100,
      diagnosisPointer: "A",
      modifier: isTelehealth ? "95" : null,
    });
  }

  // 5. Calculate total charges
  const totalCharges = Math.round(
    lineItems.reduce((sum, item) => sum + item.chargeAmount, 0) * 100
  ) / 100;

  // 6. Build and return superbill data
  return {
    provider: {
      name: billingProfile.providerName,
      credentials: billingProfile.credentials,
      npi: billingProfile.npiNumber,
      taxId: billingProfile.taxId,
      practiceName: billingProfile.practiceName,
      address: billingProfile.practiceAddress,
      city: billingProfile.practiceCity,
      state: billingProfile.practiceState,
      zip: billingProfile.practiceZip,
      phone: billingProfile.practicePhone,
      licenseNumber: billingProfile.licenseNumber,
      licenseState: billingProfile.licenseState,
      placeOfService: billingProfile.placeOfServiceCode,
    },
    client: {
      name: `${client.firstName} ${client.lastName}`.trim(),
    },
    insurance: {
      payerName: enrollment.payerName,
      subscriberId: enrollment.subscriberId,
      groupNumber: enrollment.groupNumber,
    },
    period: {
      startDate: period.periodStart.toISOString().split("T")[0],
      endDate: periodEndStr,
      engagementDays: period.engagementDays,
      clinicianMinutes: period.clinicianMinutes,
      hasInteractiveCommunication: period.hasInteractiveCommunication,
      interactiveCommunicationDate: interactiveDateStr,
    },
    diagnosisCodes: (enrollment.diagnosisCodes as string[]) || [],
    lineItems,
    totalCharges,
    generatedAt: new Date().toISOString(),
    billingPeriodId: period.id,
  };
}
