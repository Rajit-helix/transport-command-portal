import { query } from "../config/db.js";
import { getPagination } from "../utils/pagination.js";
import { badRequest, notFound } from "../utils/errors.js";
import { writeAuditLog } from "../services/audit.service.js";
import { cacheDeleteByPrefix } from "../services/cache.service.js";

export async function listSchedules(req, res, next) {
  try {
    const q = req.validated.query || {};
    const { page, limit, offset } = getPagination(q);

    const values = [];
    const where = [];

    if (q.routeId) {
      values.push(q.routeId);
      where.push(`s.route_id = $${values.length}`);
    }
    if (q.vehicleId) {
      values.push(q.vehicleId);
      where.push(`s.vehicle_id = $${values.length}`);
    }
    if (q.status) {
      values.push(q.status);
      where.push(`s.status = $${values.length}`);
    }
    if (q.from) {
      values.push(q.from);
      where.push(`s.departure_time >= $${values.length}`);
    }
    if (q.to) {
      values.push(q.to);
      where.push(`s.departure_time <= $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    values.push(limit);
    values.push(offset);

    const data = await query(
      `SELECT s.*, r.source, r.destination, v.registration_number
       FROM schedules s
       JOIN routes r ON r.id = s.route_id
       JOIN vehicles v ON v.id = s.vehicle_id
       ${whereSql}
       ORDER BY s.departure_time ASC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    const countValues = values.slice(0, values.length - 2);
    const count = await query(`SELECT COUNT(*)::int as total FROM schedules s ${whereSql}`, countValues);

    res.json({ data: data.rows, pagination: { page, limit, total: count.rows[0].total } });
  } catch (error) {
    next(error);
  }
}

export async function getScheduleById(req, res, next) {
  try {
    const result = await query("SELECT * FROM schedules WHERE id = $1", [req.validated.params.id]);
    if (result.rowCount === 0) {
      throw notFound("Schedule not found");
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function createSchedule(req, res, next) {
  try {
    const { routeId, vehicleId, departureTime, arrivalTime, totalSeats } = req.validated.body;
    if (new Date(arrivalTime).getTime() <= new Date(departureTime).getTime()) {
      throw badRequest("arrivalTime must be after departureTime");
    }

    const result = await query(
      `INSERT INTO schedules (route_id, vehicle_id, departure_time, arrival_time, total_seats, available_seats)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING *`,
      [routeId, vehicleId, departureTime, arrivalTime, totalSeats]
    );
    await cacheDeleteByPrefix("routes:list:");

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "CREATE_SCHEDULE",
      entityType: "SCHEDULE",
      entityId: result.rows[0].id,
      requestId: req.id,
      metadata: result.rows[0]
    });

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { routeId, vehicleId, departureTime, arrivalTime, totalSeats, availableSeats, status } =
      req.validated.body;

    const result = await query(
      `UPDATE schedules
       SET route_id = COALESCE($1, route_id),
           vehicle_id = COALESCE($2, vehicle_id),
           departure_time = COALESCE($3, departure_time),
           arrival_time = COALESCE($4, arrival_time),
           total_seats = COALESCE($5, total_seats),
           available_seats = COALESCE($6, available_seats),
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [routeId, vehicleId, departureTime, arrivalTime, totalSeats, availableSeats, status, id]
    );

    if (result.rowCount === 0) {
      throw notFound("Schedule not found");
    }
    await cacheDeleteByPrefix("routes:list:");

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "UPDATE_SCHEDULE",
      entityType: "SCHEDULE",
      entityId: id,
      requestId: req.id,
      metadata: req.validated.body
    });

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function deleteSchedule(req, res, next) {
  try {
    const result = await query("DELETE FROM schedules WHERE id = $1 RETURNING id", [req.validated.params.id]);
    if (result.rowCount === 0) {
      throw notFound("Schedule not found");
    }
    await cacheDeleteByPrefix("routes:list:");

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "DELETE_SCHEDULE",
      entityType: "SCHEDULE",
      entityId: req.validated.params.id,
      requestId: req.id
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
