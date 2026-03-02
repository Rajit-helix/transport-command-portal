import { Router } from "express";
import {
  cancelBooking,
  createBooking,
  getBookingById,
  listBookings,
  updateBookingStatus
} from "../controllers/bookings.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { bookingRateLimit } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import {
  bookingIdSchema,
  createBookingSchema,
  listBookingsSchema,
  updateBookingStatusSchema
} from "../validators/booking.validators.js";

const router = Router();

router.get("/", requireAuth, requirePermission("bookings:read"), validate(listBookingsSchema), listBookings);
router.get("/:id", requireAuth, requirePermission("bookings:read"), validate(bookingIdSchema), getBookingById);
router.post(
  "/",
  bookingRateLimit,
  requireAuth,
  requirePermission("bookings:create"),
  validate(createBookingSchema),
  createBooking
);
router.patch(
  "/:id/cancel",
  bookingRateLimit,
  requireAuth,
  requirePermission("bookings:cancel"),
  validate(bookingIdSchema),
  cancelBooking
);
router.patch(
  "/:id/status",
  requireAuth,
  requirePermission("bookings:update_status"),
  validate(updateBookingStatusSchema),
  updateBookingStatus
);

export default router;
