import { query } from "../config/db.js";
import { getPagination } from "../utils/pagination.js";
import { notFound } from "../utils/errors.js";
import { writeAuditLog } from "../services/audit.service.js";

export async function listVehicles(req, res, next) {
  try {
    const q = req.validated.query || {};
    const { page, limit, offset } = getPagination(q);

    const values = [];
    const where = [];

    if (q.includeDeleted !== "true") {
      where.push("deleted_at IS NULL");
    }

    if (q.vehicleType) {
      values.push(`%${q.vehicleType}%`);
      where.push(`vehicle_type ILIKE $${values.length}`);
    }
    if (q.status) {
      values.push(q.status);
      where.push(`status = $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    values.push(limit);
    values.push(offset);

    const data = await query(
      `SELECT * FROM vehicles ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    const countValues = values.slice(0, values.length - 2);
    const count = await query(`SELECT COUNT(*)::int as total FROM vehicles ${whereSql}`, countValues);

    res.json({ data: data.rows, pagination: { page, limit, total: count.rows[0].total } });
  } catch (error) {
    next(error);
  }
}

export async function getVehicleById(req, res, next) {
  try {
    const result = await query("SELECT * FROM vehicles WHERE id = $1", [req.validated.params.id]);
    if (result.rowCount === 0) {
      throw notFound("Vehicle not found");
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function createVehicle(req, res, next) {
  try {
    const { registrationNumber, vehicleType, capacity } = req.validated.body;
    const result = await query(
      `INSERT INTO vehicles (registration_number, vehicle_type, capacity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [registrationNumber, vehicleType, capacity]
    );

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "CREATE_VEHICLE",
      entityType: "VEHICLE",
      entityId: result.rows[0].id,
      requestId: req.id,
      metadata: result.rows[0]
    });

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function updateVehicle(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { registrationNumber, vehicleType, capacity, status, isActive } = req.validated.body;

    const result = await query(
      `UPDATE vehicles
       SET registration_number = COALESCE($1, registration_number),
           vehicle_type = COALESCE($2, vehicle_type),
           capacity = COALESCE($3, capacity),
           status = COALESCE($4, status),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6 AND deleted_at IS NULL
       RETURNING *`,
      [registrationNumber, vehicleType, capacity, status, isActive, id]
    );

    if (result.rowCount === 0) {
      throw notFound("Vehicle not found");
    }

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "UPDATE_VEHICLE",
      entityType: "VEHICLE",
      entityId: id,
      requestId: req.id,
      metadata: req.validated.body
    });

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function deleteVehicle(req, res, next) {
  try {
    const { id } = req.validated.params;
    const result = await query(
      `UPDATE vehicles SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      throw notFound("Vehicle not found");
    }

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "DELETE_VEHICLE",
      entityType: "VEHICLE",
      entityId: id,
      requestId: req.id
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
