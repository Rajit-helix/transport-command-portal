import { query } from "../config/db.js";
import { conflict, notFound } from "../utils/errors.js";
import { writeAuditLog } from "../services/audit.service.js";

function normalizeCityName(value) {
  return value.trim().replace(/\s+/g, " ");
}

export async function listCities(req, res, next) {
  try {
    const q = req.validated.query || {};
    const where = [];
    const values = [];

    if (q.includeInactive !== "true") {
      where.push("is_active = TRUE");
    }

    if (q.search) {
      values.push(`%${q.search}%`);
      where.push(`name ILIKE $${values.length}`);
    }

    values.push(q.limit || 200);
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await query(
      `SELECT id, name, state, country, is_active
       FROM cities
       ${whereSql}
       ORDER BY name ASC
       LIMIT $${values.length}`,
      values
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function createCity(req, res, next) {
  try {
    const name = normalizeCityName(req.validated.body.name);
    const state = req.validated.body.state ? req.validated.body.state.trim() : null;
    const country = req.validated.body.country ? req.validated.body.country.trim() : "India";

    const existing = await query("SELECT id FROM cities WHERE LOWER(name) = LOWER($1) LIMIT 1", [name]);
    if (existing.rowCount > 0) {
      throw conflict("City already exists");
    }

    const result = await query(
      `INSERT INTO cities (name, state, country, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, name, state, country, is_active`,
      [name, state, country]
    );

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "CREATE_CITY",
      entityType: "CITY",
      entityId: String(result.rows[0].id),
      requestId: req.id,
      metadata: result.rows[0]
    });

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function updateCity(req, res, next) {
  try {
    const { id } = req.validated.params;
    const payload = req.validated.body;

    let nextName = payload.name ? normalizeCityName(payload.name) : null;
    if (nextName) {
      const duplicate = await query(
        "SELECT id FROM cities WHERE LOWER(name) = LOWER($1) AND id <> $2 LIMIT 1",
        [nextName, id]
      );
      if (duplicate.rowCount > 0) {
        throw conflict("City already exists");
      }
    }

    const state = Object.prototype.hasOwnProperty.call(payload, "state") ? payload.state.trim() || null : undefined;
    const country =
      Object.prototype.hasOwnProperty.call(payload, "country") && payload.country !== undefined
        ? payload.country.trim()
        : undefined;
    const isActive =
      Object.prototype.hasOwnProperty.call(payload, "isActive") && payload.isActive !== undefined
        ? payload.isActive
        : undefined;

    const result = await query(
      `UPDATE cities
       SET name = COALESCE($1, name),
           state = COALESCE($2, state),
           country = COALESCE($3, country),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, state, country, is_active`,
      [nextName, state, country, isActive, id]
    );

    if (result.rowCount === 0) {
      throw notFound("City not found");
    }

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "UPDATE_CITY",
      entityType: "CITY",
      entityId: String(id),
      requestId: req.id,
      metadata: payload
    });

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}
