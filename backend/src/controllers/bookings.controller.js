import { query, withTransaction } from "../config/db.js";
import { getPagination } from "../utils/pagination.js";
import { conflict, notFound, forbidden } from "../utils/errors.js";
import { writeAuditLog } from "../services/audit.service.js";
import { assertBookingTransition } from "../services/booking-state.service.js";
import { enqueueNotification } from "../services/notification-queue.service.js";
import { getIo } from "../config/socket.js";

function dynamicPrice(basePrice, availableSeats, totalSeats, departureTime) {
  const occupancy = 1 - availableSeats / totalSeats;
  const hoursToDeparture = Math.max(1, (new Date(departureTime).getTime() - Date.now()) / 3600000);
  const occupancyFactor = 1 + occupancy * 0.35;
  const urgencyFactor = hoursToDeparture < 6 ? 1.2 : 1;
  return Number((basePrice * occupancyFactor * urgencyFactor).toFixed(2));
}

export async function listBookings(req, res, next) {
  try {
    const q = req.validated.query || {};
    const { page, limit, offset } = getPagination(q);

    const values = [];
    const where = [];

    if (q.status) {
      values.push(q.status);
      where.push(`b.status = $${values.length}`);
    }
    if (q.customerId) {
      values.push(q.customerId);
      where.push(`b.customer_id = $${values.length}`);
    }
    if (q.scheduleId) {
      values.push(q.scheduleId);
      where.push(`b.schedule_id = $${values.length}`);
    }

    if (req.user.role === "CUSTOMER") {
      values.push(req.user.id);
      where.push(`b.customer_id = $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    values.push(limit);
    values.push(offset);

    const result = await query(
      `SELECT b.*, r.source, r.destination, s.departure_time
       FROM bookings b
       JOIN schedules s ON s.id = b.schedule_id
       JOIN routes r ON r.id = s.route_id
       ${whereSql}
       ORDER BY b.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    const countValues = values.slice(0, values.length - 2);
    const count = await query(`SELECT COUNT(*)::int as total FROM bookings b ${whereSql}`, countValues);

    res.json({ data: result.rows, pagination: { page, limit, total: count.rows[0].total } });
  } catch (error) {
    next(error);
  }
}

export async function createBooking(req, res, next) {
  try {
    const { scheduleId, seatCount } = req.validated.body;

    const booking = await withTransaction(async (client) => {
      const scheduleResult = await client.query(
        `SELECT s.id, s.available_seats, s.total_seats, s.departure_time, r.base_price
         FROM schedules s
         JOIN routes r ON r.id = s.route_id
         WHERE s.id = $1 AND s.status = 'SCHEDULED'
         FOR UPDATE`,
        [scheduleId]
      );

      if (scheduleResult.rowCount === 0) {
        throw notFound("Schedule not found");
      }

      const schedule = scheduleResult.rows[0];
      if (schedule.available_seats < seatCount) {
        throw conflict("Insufficient seats");
      }

      const unitPrice = dynamicPrice(
        Number(schedule.base_price),
        schedule.available_seats,
        schedule.total_seats,
        schedule.departure_time
      );
      const totalPrice = Number((unitPrice * seatCount).toFixed(2));

      const bookingResult = await client.query(
        `INSERT INTO bookings (customer_id, schedule_id, seat_count, total_price, status)
         VALUES ($1, $2, $3, $4, 'CONFIRMED')
         RETURNING *`,
        [req.user.id, scheduleId, seatCount, totalPrice]
      );

      await client.query("UPDATE schedules SET available_seats = available_seats - $1 WHERE id = $2", [
        seatCount,
        scheduleId
      ]);

      return bookingResult.rows[0];
    });

    const io = getIo();
    if (io) {
      io.to(`schedule:${booking.schedule_id}`).emit("booking:status", booking);
    }

    await enqueueNotification({ type: "BOOKING_CREATED", bookingId: booking.id, customerId: req.user.id });
    await writeAuditLog({
      actorUserId: req.user.id,
      action: "CREATE_BOOKING",
      entityType: "BOOKING",
      entityId: booking.id,
      requestId: req.id,
      metadata: booking
    });

    res.status(201).json({ data: booking });
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { status } = req.validated.body;

    const result = await withTransaction(async (client) => {
      const bookingResult = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [id]);
      if (bookingResult.rowCount === 0) {
        throw notFound("Booking not found");
      }

      const booking = bookingResult.rows[0];
      if (req.user.role === "CUSTOMER" && booking.customer_id !== req.user.id) {
        throw forbidden("Cannot update other customer booking");
      }

      if (!assertBookingTransition(booking.status, status)) {
        throw conflict(`Cannot transition from ${booking.status} to ${status}`);
      }

      if (status === "CANCELLED" && booking.status !== "CANCELLED") {
        await client.query("UPDATE schedules SET available_seats = available_seats + $1 WHERE id = $2", [
          booking.seat_count,
          booking.schedule_id
        ]);
      }

      const updated = await client.query(
        "UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [status, id]
      );

      return updated.rows[0];
    });

    const io = getIo();
    if (io) {
      io.to(`schedule:${result.schedule_id}`).emit("booking:status", result);
    }

    await enqueueNotification({
      type: "BOOKING_STATUS_UPDATED",
      bookingId: result.id,
      status: result.status,
      customerId: result.customer_id
    });

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "UPDATE_BOOKING_STATUS",
      entityType: "BOOKING",
      entityId: id,
      requestId: req.id,
      metadata: { status }
    });

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(req, res, next) {
  try {
    const { id } = req.validated.params;
    const result = await query("SELECT * FROM bookings WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      throw notFound("Booking not found");
    }

    if (req.user.role === "CUSTOMER" && result.rows[0].customer_id !== req.user.id) {
      throw forbidden("Cannot view this booking");
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(req, res, next) {
  req.validated.body = { status: "CANCELLED" };
  return updateBookingStatus(req, res, next);
}
