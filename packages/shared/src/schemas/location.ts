import { z } from "zod";

export const LocationTypeEnum = z.enum(["IN_PERSON", "VIRTUAL"]);

export const CreateLocationSchema = z.object({
  name: z.string().min(1).max(200),
  type: LocationTypeEnum,
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postalCode: z.string().max(20).optional(),
  timezone: z.string().max(100).optional(),
});

export const UpdateLocationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: LocationTypeEnum.optional(),
  addressLine1: z.string().max(200).nullable().optional(),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
});

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
export type LocationType = z.infer<typeof LocationTypeEnum>;
