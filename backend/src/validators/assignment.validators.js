import { z } from "zod";

export const createAssignmentSchema = z.object({
  body: z.object({
    driverId: z.string().uuid(),
    scheduleId: z.string().uuid()
  }),
  params: z.object({}),
  query: z.object({})
});

export const createBulkAssignmentsSchema = z.object({
  body: z.object({
    driverId: z.string().uuid(),
    scheduleIds: z.array(z.string().uuid()).min(1).max(100)
  }),
  params: z.object({}),
  query: z.object({})
});

export const updateAssignmentSchema = z.object({
  body: z.object({
    assignmentStatus: z.enum(["ASSIGNED", "IN_PROGRESS", "ARRIVED", "COMPLETED"])
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});

export const listAssignmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    driverId: z.string().uuid().optional(),
    scheduleId: z.string().uuid().optional(),
    assignmentStatus: z.string().optional()
  })
});

export const assignmentIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});
