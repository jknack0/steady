/**
 * PHI Detection Client
 *
 * Calls the PHI detector sidecar service (Python/ML-based) for
 * HIPAA-grade detection. Falls back to local regex patterns if
 * the service is unavailable.
 */

import { logger } from "./logger";

const PHI_SERVICE_URL = process.env.PHI_DETECTOR_URL || "http://localhost:8000";

interface PhiDetection {
  found: boolean;
  matches: string[];
  entityCount: number;
}

interface ServiceEntity {
  text: string;
  category: string;
  start: number;
  end: number;
  confidence: number;
  source: string;
  explanation: string;
}

interface ServiceResponse {
  found: boolean;
  entity_count: number;
  entities: ServiceEntity[];
}

/**
 * Detect PHI using the sidecar service (ML + regex + context + checksum).
 * Falls back to local regex if service is unavailable.
 */
export async function detectPhi(text: string): Promise<PhiDetection> {
  if (!text || typeof text !== "string") {
    return { found: false, matches: [], entityCount: 0 };
  }

  try {
    const res = await fetch(`${PHI_SERVICE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, min_confidence: 0.4 }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      throw new Error(`PHI service returned ${res.status}`);
    }

    const data: ServiceResponse = await res.json();
    const categories = [...new Set(data.entities.map((e) => e.category))];

    return {
      found: data.found,
      matches: categories,
      entityCount: data.entity_count,
    };
  } catch (err) {
    logger.warn("PHI detector service unavailable, using local fallback");
    return detectPhiLocal(text);
  }
}

/**
 * Throws if PHI is detected in the text.
 * Use before sending content to external APIs.
 */
export async function assertNoPhi(text: string, context: string): Promise<void> {
  const result = await detectPhi(text);
  if (result.found) {
    throw new PhiDetectedError(
      `Content may contain protected health information (${result.matches.join(", ")}). ` +
      `Please remove personal identifiers before using AI features.`,
      result.matches
    );
  }
}

export class PhiDetectedError extends Error {
  public detectedTypes: string[];

  constructor(message: string, detectedTypes: string[]) {
    super(message);
    this.name = "PhiDetectedError";
    this.detectedTypes = detectedTypes;
  }
}

// ── Local Fallback (regex-only) ─────────────────────────

const PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "SSN", pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g },
  { name: "PHONE", pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { name: "DATE", pattern: /\b(?:DOB|date\s+of\s+birth|born|birthday)\s*[:=]?\s*\d/i },
  { name: "EMAIL", pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g },
  { name: "MRN", pattern: /\b(?:MRN|medical\s*record|patient\s*(?:id|number|#)|chart\s*#?)\s*[:=]?\s*[A-Z0-9-]+/gi },
  { name: "NAME", pattern: /\b(?:patient|client)\s*(?:name)?\s*[:=]\s*[A-Z][a-z]+\s+[A-Z][a-z]+/gi },
  { name: "GEOGRAPHIC", pattern: /\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Dr(?:ive)?|Rd|Road|Ln|Lane|Way|Ct|Court|Pl(?:ace)?|Cir(?:cle)?)\b/gi },
  { name: "INSURANCE", pattern: /\b(?:policy|insurance|member|subscriber)\s*(?:id|#|number|no)?\s*[:=]?\s*[A-Z0-9-]{5,}/gi },
];

function detectPhiLocal(text: string): PhiDetection {
  const matches: string[] = [];

  for (const { name, pattern } of PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      matches.push(name);
    }
  }

  return { found: matches.length > 0, matches, entityCount: matches.length };
}
