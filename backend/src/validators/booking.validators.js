import { z } from "zod";

export const createBookingSchema = z.object({
  body: z.object({
    scheduleId: z.string().uuid(),
    seatCount: z.number().int().positive()
  }),
  params: z.object({}),
  query: z.object({})
});

export const updateBookingStatusSchema = z.object({
  body: z.object({
    status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});

export const bookingIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});

export const listBookingsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.string().optional(),
    customerId: z.string().uuid().optional(),
    scheduleId: z.string().uuid().optional()
  })
});
