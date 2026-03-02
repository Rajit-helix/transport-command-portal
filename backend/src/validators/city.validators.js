import { z } from "zod";

export const listCitiesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    includeInactive: z.enum(["true", "false"]).optional()
  })
});

export const createCitySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(80).optional(),
    country: z.string().trim().min(2).max(80).optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const updateCitySchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      state: z.string().trim().max(80).optional(),
      country: z.string().trim().min(2).max(80).optional(),
      isActive: z.boolean().optional()
    })
    .refine((v) => Object.keys(v).length > 0, "At least one field is required"),
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  query: z.object({}).optional()
});
