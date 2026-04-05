import { Prisma, PrismaClient } from "@prisma/client";
import { encryptField, decryptField } from "./crypto";

/**
 * Map of Prisma model names to the fields that require encryption.
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Session: ["clinicianNotes", "participantSummary"],
  RtmEnrollment: ["subscriberId", "groupNumber"],
  ClinicianBillingProfile: ["npiNumber", "taxId", "licenseNumber"],
  PatientInvitation: ["patientName", "patientEmail"],
};

/** Prisma actions that write data and need encryption on input. */
const WRITE_ACTIONS = new Set(["create", "update", "upsert", "createMany", "updateMany"]);

/** Prisma actions that return data and need decryption on output. */
const READ_ACTIONS = new Set([
  "findUnique", "findFirst", "findMany",
  "create", "update", "upsert",
  "delete",
]);

/**
 * Encrypt sensitive fields in a data object (mutates in place).
 */
function encryptFields(data: Record<string, any>, fields: string[]): void {
  for (const field of fields) {
    if (data[field] != null && typeof data[field] === "string") {
      data[field] = encryptField(data[field]);
    }
  }
}

/**
 * Decrypt sensitive fields on a single record (mutates in place).
 */
function decryptRecord(record: Record<string, any>, fields: string[]): void {
  for (const field of fields) {
    if (record[field] != null && typeof record[field] === "string") {
      record[field] = decryptField(record[field]);
    }
  }
}

/**
 * Decrypt fields on a result which may be a single record or array.
 */
function decryptResult(result: any, fields: string[]): any {
  if (result == null) return result;
  if (Array.isArray(result)) {
    for (const record of result) {
      decryptRecord(record, fields);
    }
  } else if (typeof result === "object") {
    decryptRecord(result, fields);
  }
  return result;
}

/**
 * Register field-level encryption middleware on a PrismaClient instance.
 * Transparently encrypts on write, decrypts on read.
 */
export function registerEncryptionMiddleware(client: PrismaClient): void {
  client.$use(async (params: Prisma.MiddlewareParams, next) => {
    const model = params.model;
    if (!model || !ENCRYPTED_FIELDS[model]) {
      return next(params);
    }

    const fields = ENCRYPTED_FIELDS[model];

    // Encrypt on write
    if (WRITE_ACTIONS.has(params.action)) {
      const args = params.args;

      if (args?.data) {
        encryptFields(args.data, fields);
      }

      // upsert has separate create/update data
      if (params.action === "upsert") {
        if (args?.create) encryptFields(args.create, fields);
        if (args?.update) encryptFields(args.update, fields);
      }

      // createMany has an array of data
      if (params.action === "createMany" && Array.isArray(args?.data)) {
        for (const item of args.data) {
          encryptFields(item, fields);
        }
      }
    }

    const result = await next(params);

    // Decrypt on read
    if (READ_ACTIONS.has(params.action)) {
      decryptResult(result, fields);
    }

    return result;
  });
}
