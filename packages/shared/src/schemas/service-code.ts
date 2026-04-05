import { z } from "zod";

export const ServiceCodeResponseSchema = z.object({
  id: z.string(),
  practiceId: z.string(),
  code: z.string().max(20),
  description: z.string().max(200),
  defaultDurationMinutes: z.number().int(),
  defaultPriceCents: z.number().int().nullable(),
  isActive: z.boolean(),
});

export interface ServiceCodeSeed {
  code: string;
  description: string;
  defaultDurationMinutes: number;
  defaultPriceCents: number;
}

export const SERVICE_CODE_SEED: ServiceCodeSeed[] = [
  { code: "90791", description: "Psychiatric Diagnostic Evaluation", defaultDurationMinutes: 60, defaultPriceCents: 20000 },
  { code: "90832", description: "Psychotherapy, 30 min", defaultDurationMinutes: 30, defaultPriceCents: 10000 },
  { code: "90834", description: "Psychotherapy, 45 min", defaultDurationMinutes: 45, defaultPriceCents: 14000 },
  { code: "90837", description: "Psychotherapy, 60 min", defaultDurationMinutes: 60, defaultPriceCents: 18000 },
  { code: "90846", description: "Family Psychotherapy w/o patient, 50 min", defaultDurationMinutes: 50, defaultPriceCents: 16000 },
  { code: "90847", description: "Family Psychotherapy w/ patient, 50 min", defaultDurationMinutes: 50, defaultPriceCents: 17000 },
  { code: "90853", description: "Group Psychotherapy", defaultDurationMinutes: 60, defaultPriceCents: 8000 },
  { code: "90839", description: "Psychotherapy for crisis, first 60 min", defaultDurationMinutes: 60, defaultPriceCents: 22000 },
  { code: "90840", description: "Psychotherapy for crisis, each add'l 30 min", defaultDurationMinutes: 30, defaultPriceCents: 11000 },
  { code: "96127", description: "Brief emotional/behavioral assessment", defaultDurationMinutes: 10, defaultPriceCents: 1500 },
  { code: "96136", description: "Psychological test administration, 30 min", defaultDurationMinutes: 30, defaultPriceCents: 10000 },
  { code: "96138", description: "Psychological test administration, 30 min (tech)", defaultDurationMinutes: 30, defaultPriceCents: 7000 },
  { code: "99354", description: "Prolonged service, first hour", defaultDurationMinutes: 60, defaultPriceCents: 15000 },
  { code: "99355", description: "Prolonged service, each add'l 30 min", defaultDurationMinutes: 30, defaultPriceCents: 7500 },
  { code: "90785", description: "Interactive complexity add-on", defaultDurationMinutes: 0, defaultPriceCents: 2500 },
];

export type ServiceCodeResponse = z.infer<typeof ServiceCodeResponseSchema>;
