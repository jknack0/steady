/**
 * PHI Detection Utility
 *
 * Scans text for patterns that indicate Protected Health Information (PHI)
 * before sending content to external services (e.g., Anthropic API).
 *
 * This is a guardrail against accidental PHI inclusion in clinical content,
 * not a full de-identification system. It catches common patterns:
 * - Social Security Numbers
 * - Phone numbers
 * - Dates of birth (various formats)
 * - Email addresses
 * - Medical Record Numbers (MRN patterns)
 * - Common "Patient:" or "Client:" label patterns
 * - Street addresses
 */

interface PhiDetection {
  found: boolean;
  matches: string[];
}

// SSN: 123-45-6789 or 123456789
const SSN_PATTERN = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g;

// Phone: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890
const PHONE_PATTERN = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

// DOB labels: "DOB: 01/15/1990", "Date of Birth: January 15, 1990", "born 01/15/90"
const DOB_LABEL_PATTERN = /\b(?:DOB|date\s+of\s+birth|born|birthday|birthdate)\s*[:=]?\s*\d/i;

// Dates that look like DOBs: MM/DD/YYYY, MM-DD-YYYY (not ambiguous dates like "Week 3")
const DATE_PATTERN = /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g;

// Email addresses
const EMAIL_PATTERN = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;

// MRN/Patient ID patterns: "MRN: 12345", "Patient ID: ABC123", "Chart #12345"
const MRN_PATTERN = /\b(?:MRN|medical\s*record|patient\s*(?:id|number|#)|chart\s*#?)\s*[:=]?\s*[A-Z0-9-]+/gi;

// Patient/Client name labels: "Patient: John Smith", "Client Name: Jane Doe"
const PATIENT_LABEL_PATTERN = /\b(?:patient|client)\s*(?:name)?\s*[:=]\s*[A-Z][a-z]+\s+[A-Z][a-z]+/gi;

// Street addresses: "123 Main St", "456 Oak Avenue, Apt 2"
const ADDRESS_PATTERN = /\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Dr(?:ive)?|Rd|Road|Ln|Lane|Way|Ct|Court|Pl(?:ace)?|Cir(?:cle)?)\b/gi;

// Insurance/policy numbers: "Policy #: ABC123", "Insurance ID: XYZ789"
const INSURANCE_PATTERN = /\b(?:policy|insurance|member|subscriber)\s*(?:id|#|number|no)?\s*[:=]?\s*[A-Z0-9-]{5,}/gi;

const PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "SSN", pattern: SSN_PATTERN },
  { name: "Phone number", pattern: PHONE_PATTERN },
  { name: "Date of birth", pattern: DOB_LABEL_PATTERN },
  { name: "Date (possible DOB)", pattern: DATE_PATTERN },
  { name: "Email address", pattern: EMAIL_PATTERN },
  { name: "Medical record number", pattern: MRN_PATTERN },
  { name: "Patient/client name", pattern: PATIENT_LABEL_PATTERN },
  { name: "Street address", pattern: ADDRESS_PATTERN },
  { name: "Insurance ID", pattern: INSURANCE_PATTERN },
];

/**
 * Scan text for potential PHI patterns.
 * Returns { found: true, matches: [...] } if PHI detected.
 */
export function detectPhi(text: string): PhiDetection {
  if (!text || typeof text !== "string") {
    return { found: false, matches: [] };
  }

  const matches: string[] = [];

  for (const { name, pattern } of PATTERNS) {
    // Reset regex state for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      matches.push(name);
    }
  }

  return { found: matches.length > 0, matches };
}

/**
 * Throws if PHI is detected in the text.
 * Use before sending content to external APIs.
 */
export function assertNoPhi(text: string, context: string): void {
  const result = detectPhi(text);
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
