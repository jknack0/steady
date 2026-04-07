import { logger } from "../lib/logger";

const STEDI_BASE_URL = "https://healthcare.us.stedi.com/2024-04-01";
const STEDI_TIMEOUT_MS = 10_000;

export interface EligibilityResult {
  coverageActive: boolean;
  copayAmountCents: number | null;
  deductibleRemainingCents: number | null;
  coinsurancePercent: number | null;
  planDescription: string | null;
  checkedAt: string;
}

export interface SubmissionResult {
  transactionId: string;
  status: string;
}

export interface StatusResult {
  status: "ACCEPTED" | "REJECTED" | "DENIED" | "PAID";
  rejectionReason?: string;
}

export interface PayerResult {
  payerId: string;
  name: string;
}

export interface StediError {
  error: string;
  message: string;
}

function isStediError(result: any): result is StediError {
  return result && typeof result.error === "string";
}

async function stediRequest(
  apiKey: string,
  method: string,
  path: string,
  body?: Record<string, any>,
  headers?: Record<string, string>,
): Promise<any> {
  // apiKey is already decrypted by Prisma encryption middleware on read
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STEDI_TIMEOUT_MS);

  try {
    const response = await fetch(`${STEDI_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data: any = await response.json();

    if (!response.ok) {
      logger.warn("Stedi API error", `${response.status} ${path}`);
      return { error: "stedi_error", message: data?.message || `Stedi returned ${response.status}` };
    }

    return data;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { error: "stedi_timeout", message: "Stedi API request timed out" };
    }
    logger.error("Stedi API request failed", err);
    return { error: "stedi_unavailable", message: "Unable to connect to Stedi" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkEligibility(
  encryptedApiKey: string,
  request: {
    subscriberId: string;
    payerId: string;
    providerNpi: string;
    serviceTypeCode?: string;
  },
): Promise<EligibilityResult | StediError> {
  const result = await stediRequest(encryptedApiKey, "POST", "/change/medicalnetwork/eligibility/v3", {
    controlNumber: String(Date.now()),
    tradingPartnerServiceId: request.payerId,
    provider: { npi: request.providerNpi },
    subscriber: { memberId: request.subscriberId },
    encounter: request.serviceTypeCode ? { serviceTypeCodes: [request.serviceTypeCode] } : undefined,
  });

  if (isStediError(result)) return result;

  // Parse minimum necessary fields (COND-6)
  const benefits = result?.planStatus?.[0];
  return {
    coverageActive: benefits?.statusCode === "1" || result?.planStatus?.some((p: any) => p.statusCode === "1") || false,
    copayAmountCents: benefits?.benefitAmount ? Math.round(parseFloat(benefits.benefitAmount) * 100) : null,
    deductibleRemainingCents: null, // Parsed from specific benefit categories if available
    coinsurancePercent: benefits?.benefitPercent ? parseFloat(benefits.benefitPercent) : null,
    planDescription: result?.planName || null,
    checkedAt: new Date().toISOString(),
  };
}

export async function submitClaim(
  encryptedApiKey: string,
  claim837P: Record<string, any>,
  idempotencyKey: string,
): Promise<SubmissionResult | StediError> {
  const result = await stediRequest(
    encryptedApiKey,
    "POST",
    "/change/medicalnetwork/professionalclaims/v3/submission",
    claim837P,
    { "Idempotency-Key": idempotencyKey },
  );

  if (isStediError(result)) return result;

  return {
    transactionId: result?.transactionId || result?.claimId || "",
    status: "SUBMITTED",
  };
}

export async function checkClaimStatus(
  encryptedApiKey: string,
  stediTransactionId: string,
): Promise<StatusResult | StediError> {
  const result = await stediRequest(encryptedApiKey, "GET", `/change/medicalnetwork/professionalclaims/v3/${stediTransactionId}/status`);

  if (isStediError(result)) return result;

  // Parse minimum necessary status (COND-6)
  const statusCode = result?.status || result?.claimStatus;
  let status: StatusResult["status"] = "ACCEPTED";
  if (statusCode === "rejected" || statusCode === "4") status = "REJECTED";
  else if (statusCode === "denied" || statusCode === "22") status = "DENIED";
  else if (statusCode === "paid" || statusCode === "1" || statusCode === "finalized") status = "PAID";
  else if (statusCode === "accepted" || statusCode === "3") status = "ACCEPTED";

  return {
    status,
    rejectionReason: result?.rejectionReason || result?.statusDetail || undefined,
  };
}

export async function searchPayers(
  encryptedApiKey: string,
  query: string,
): Promise<PayerResult[] | StediError> {
  const result = await stediRequest(encryptedApiKey, "GET", `/payers?search=${encodeURIComponent(query)}`);

  if (isStediError(result)) return result;

  const payers = Array.isArray(result) ? result : result?.payers || [];
  return payers.slice(0, 20).map((p: any) => ({
    payerId: p.payerId || p.id || "",
    name: p.payerName || p.name || "",
  }));
}

export async function testConnection(encryptedApiKey: string): Promise<boolean> {
  const result = await searchPayers(encryptedApiKey, "aetna");
  return !isStediError(result);
}

export { isStediError };
