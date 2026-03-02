import { z } from "zod";

export const createScheduleSchema = z.object({
  body: z.object({
    routeId: z.string().uuid(),
    vehicleId: z.string().uuid(),
    departureTime: z.string().datetime(),
    arrivalTime: z.string().datetime(),
    totalSeats: z.number().int().positive()
  }),
  params: z.object({}),
  query: z.object({})
});

export const updateScheduleSchema = z.object({
  body: z
    .object({
      routeId: z.string().uuid().optional(),
      vehicleId: z.string().uuid().optional(),
      departureTime: z.string().datetime().optional(),
      arrivalTime: z.string().datetime().optional(),
      totalSeats: z.number().int().positive().optional(),
      availableSeats: z.number().int().min(0).optional(),
      status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]).optional()
    })
    .refine((v) => Object.keys(v).length > 0, "At least one field is required"),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});

export const listSchedulesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    routeId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    status: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  })
});

export const scheduleIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});
