import { z } from "zod";

export const createVehicleSchema = z.object({
  body: z.object({
    registrationNumber: z.string().min(4).max(30),
    vehicleType: z.string().min(2).max(50),
    capacity: z.number().int().positive()
  }),
  params: z.object({}),
  query: z.object({})
});

export const updateVehicleSchema = z.object({
  body: z
    .object({
      registrationNumber: z.string().min(4).max(30).optional(),
      vehicleType: z.string().min(2).max(50).optional(),
      capacity: z.number().int().positive().optional(),
      status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]).optional(),
      isActive: z.boolean().optional()
    })
    .refine((v) => Object.keys(v).length > 0, "At least one field is required"),
  params: z.object({
    id: z.string().uuid()
  }),
  query: z.object({})
});

export const listVehiclesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    vehicleType: z.string().optional(),
    status: z.string().optional(),
    includeDeleted: z.enum(["true", "false"]).optional()
  })
});

export const vehicleIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});
