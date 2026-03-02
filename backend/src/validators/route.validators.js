import { z } from "zod";

export const createRouteSchema = z.object({
  body: z.object({
    source: z.string().trim().min(2).max(120),
    destination: z.string().trim().min(2).max(120),
    basePrice: z.number().positive(),
    distanceKm: z.number().positive()
  }),
  params: z.object({}),
  query: z.object({})
});

export const createBulkRoutesSchema = z.object({
  body: z.object({
    routes: z
      .array(
        z.object({
          source: z.string().trim().min(2).max(120),
          destination: z.string().trim().min(2).max(120),
          basePrice: z.number().positive(),
          distanceKm: z.number().positive()
        })
      )
      .min(1)
      .max(100)
  }),
  params: z.object({}),
  query: z.object({})
});

export const updateRouteSchema = z.object({
  body: z
    .object({
      source: z.string().trim().min(2).max(120).optional(),
      destination: z.string().trim().min(2).max(120).optional(),
      basePrice: z.number().positive().optional(),
      distanceKm: z.number().positive().optional(),
      isActive: z.boolean().optional()
    })
    .refine((v) => Object.keys(v).length > 0, "At least one field is required"),
  params: z.object({
    id: z.string().uuid()
  }),
  query: z.object({})
});

export const listRoutesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    source: z.string().optional(),
    destination: z.string().optional(),
    isActive: z.enum(["true", "false"]).optional(),
    includeDeleted: z.enum(["true", "false"]).optional()
  })
});

export const routeIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});
