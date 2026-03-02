import { query, withTransaction } from "../config/db.js";
import { getPagination } from "../utils/pagination.js";
import { badRequest, notFound } from "../utils/errors.js";
import { writeAuditLog } from "../services/audit.service.js";
import { cacheDeleteByPrefix, cacheGet, cacheSet } from "../services/cache.service.js";

function routesCacheKey(queryObj) {
  return `routes:list:${JSON.stringify(queryObj)}`;
}

function normalizeCityName(value) {
  return value.trim().replace(/\s+/g, " ");
}

async function resolveActiveCities(executor, source, destination) {
  const sourceKey = normalizeCityName(source).toLowerCase();
  const destinationKey = normalizeCityName(destination).toLowerCase();
  const lookupKeys = Array.from(new Set([sourceKey, destinationKey]));

  const result = await executor.query(
    `SELECT name, LOWER(name) AS key
     FROM cities
     WHERE is_active = TRUE
       AND LOWER(name) = ANY($1::text[])`,
    [lookupKeys]
  );

  const cityMap = new Map(result.rows.map((row) => [row.key, row.name]));
  if (!cityMap.has(sourceKey)) {
    throw badRequest("Source city not found");
  }
  if (!cityMap.has(destinationKey)) {
    throw badRequest("Destination city not found");
  }

  return {
    source: cityMap.get(sourceKey),
    destination: cityMap.get(destinationKey)
  };
}

async function resolveActiveCity(executor, cityName, type) {
  const normalized = normalizeCityName(cityName);
  const result = await executor.query(
    `SELECT name
     FROM cities
     WHERE is_active = TRUE
       AND LOWER(name) = LOWER($1)
     LIMIT 1`,
    [normalized]
  );

  if (result.rowCount === 0) {
    throw badRequest(`${type} city not found`);
  }

  return result.rows[0].name;
}

async function getDefaultVehicle(client) {
  const vehicle = await client.query(
    `SELECT id, capacity
     FROM vehicles
     WHERE deleted_at IS NULL
       AND is_active = TRUE
       AND status = 'ACTIVE'
     ORDER BY created_at ASC
     LIMIT 1`
  );

  return vehicle.rows[0] || null;
}

async function createAutoSchedule(client, routeId, vehicle) {
  if (!vehicle) {
    return null;
  }

  const schedule = await client.query(
    `INSERT INTO schedules (route_id, vehicle_id, departure_time, arrival_time, total_seats, available_seats, status)
     VALUES ($1, $2, NOW() + INTERVAL '2 hour', NOW() + INTERVAL '4 hour', $3, $3, 'SCHEDULED')
     RETURNING *`,
    [routeId, vehicle.id, vehicle.capacity]
  );

  return schedule.rows[0];
}

export async function listRoutes(req, res, next) {
  try {
    const cacheKey = routesCacheKey(req.validated.query || {});
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const q = req.validated.query || {};
    const { page, limit, offset } = getPagination(q);

    const values = [];
    const where = [];

    const includeDeleted = q.includeDeleted === "true";
    if (!includeDeleted) {
      where.push("r.deleted_at IS NULL");
    }

    if (q.source) {
      values.push(`%${q.source}%`);
      where.push(`r.source ILIKE $${values.length}`);
    }
    if (q.destination) {
      values.push(`%${q.destination}%`);
      where.push(`r.destination ILIKE $${values.length}`);
    }
    if (q.isActive) {
      values.push(q.isActive === "true");
      where.push(`r.is_active = $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    values.push(limit);
    values.push(offset);

    const data = await query(
      `SELECT r.id as route_id, r.source, r.destination, r.base_price, r.distance_km, r.is_active,
              r.created_at, r.updated_at, r.deleted_at,
              s.id as schedule_id, s.departure_time, s.arrival_time, s.available_seats, s.total_seats,
              s.status as schedule_status
       FROM routes r
       LEFT JOIN schedules s ON s.route_id = r.id AND s.status = 'SCHEDULED'
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    const countValues = values.slice(0, values.length - 2);
    const count = await query(`SELECT COUNT(*)::int as total FROM routes r ${whereSql}`, countValues);

    const payload = {
      data: data.rows,
      pagination: {
        page,
        limit,
        total: count.rows[0].total
      }
    };

    await cacheSet(cacheKey, payload, 45);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function getRouteById(req, res, next) {
  try {
    const { id } = req.validated.params;
    const result = await query("SELECT * FROM routes WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      throw notFound("Route not found");
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function createRoute(req, res, next) {
  try {
    const source = normalizeCityName(req.validated.body.source);
    const destination = normalizeCityName(req.validated.body.destination);
    const { basePrice, distanceKm } = req.validated.body;
    if (source.toLowerCase() === destination.toLowerCase()) {
      throw badRequest("Source and destination cannot be same");
    }

    const { route, autoSchedule } = await withTransaction(async (client) => {
      const resolvedCities = await resolveActiveCities(client, source, destination);
      const routeResult = await client.query(
        `INSERT INTO routes (source, destination, base_price, distance_km)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [resolvedCities.source, resolvedCities.destination, basePrice, distanceKm]
      );

      const vehicle = await getDefaultVehicle(client);
      const schedule = await createAutoSchedule(client, routeResult.rows[0].id, vehicle);

      return { route: routeResult.rows[0], autoSchedule: schedule };
    });

    await cacheDeleteByPrefix("routes:list:");
    await writeAuditLog({
      actorUserId: req.user.id,
      action: "CREATE_ROUTE",
      entityType: "ROUTE",
      entityId: route.id,
      requestId: req.id,
      metadata: { ...route, auto_schedule_id: autoSchedule?.id || null }
    });

    if (autoSchedule) {
      await writeAuditLog({
        actorUserId: req.user.id,
        action: "CREATE_SCHEDULE",
        entityType: "SCHEDULE",
        entityId: autoSchedule.id,
        requestId: req.id,
        metadata: { ...autoSchedule, auto_created: true, source: "CREATE_ROUTE" }
      });
    }

    res.status(201).json({ data: { ...route, auto_schedule_id: autoSchedule?.id || null } });
  } catch (error) {
    next(error);
  }
}

export async function createBulkRoutes(req, res, next) {
  try {
    const rows = req.validated.body.routes;
    const created = [];
    const failed = [];

    for (let index = 0; index < rows.length; index += 1) {
      const item = rows[index];
      const source = normalizeCityName(item.source);
      const destination = normalizeCityName(item.destination);

      if (source.toLowerCase() === destination.toLowerCase()) {
        failed.push({
          index,
          reason: "Source and destination cannot be same",
          payload: item
        });
        continue;
      }

      let resolvedCities;
      try {
        resolvedCities = await resolveActiveCities({ query }, source, destination);
      } catch (error) {
        failed.push({
          index,
          reason: error.message || "Source or destination city not found",
          payload: item
        });
        continue;
      }

      const exists = await query(
        `SELECT id
         FROM routes
         WHERE LOWER(source) = LOWER($1)
           AND LOWER(destination) = LOWER($2)
           AND deleted_at IS NULL
         LIMIT 1`,
        [resolvedCities.source, resolvedCities.destination]
      );

      if (exists.rowCount > 0) {
        failed.push({
          index,
          reason: "Active route already exists",
          payload: item
        });
        continue;
      }

      const { route, autoSchedule } = await withTransaction(async (client) => {
        const routeResult = await client.query(
          `INSERT INTO routes (source, destination, base_price, distance_km)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [resolvedCities.source, resolvedCities.destination, item.basePrice, item.distanceKm]
        );

        const vehicle = await getDefaultVehicle(client);
        const schedule = await createAutoSchedule(client, routeResult.rows[0].id, vehicle);

        return { route: routeResult.rows[0], autoSchedule: schedule };
      });

      created.push({ ...route, auto_schedule_id: autoSchedule?.id || null });

      await writeAuditLog({
        actorUserId: req.user.id,
        action: "CREATE_ROUTE",
        entityType: "ROUTE",
        entityId: route.id,
        requestId: req.id,
        metadata: { ...route, auto_schedule_id: autoSchedule?.id || null }
      });

      if (autoSchedule) {
        await writeAuditLog({
          actorUserId: req.user.id,
          action: "CREATE_SCHEDULE",
          entityType: "SCHEDULE",
          entityId: autoSchedule.id,
          requestId: req.id,
          metadata: { ...autoSchedule, auto_created: true, source: "CREATE_BULK_ROUTE" }
        });
      }
    }

    if (created.length > 0) {
      await cacheDeleteByPrefix("routes:list:");
    }

    res.status(201).json({
      data: {
        createdCount: created.length,
        failedCount: failed.length,
        created,
        failed
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRoute(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { basePrice, distanceKm, isActive } = req.validated.body;

    const existing = await query(
      `SELECT id, source, destination
       FROM routes
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (existing.rowCount === 0) {
      throw notFound("Route not found");
    }

    const nextSource =
      req.validated.body.source !== undefined
        ? await resolveActiveCity({ query }, req.validated.body.source, "Source")
        : undefined;
    const nextDestination =
      req.validated.body.destination !== undefined
        ? await resolveActiveCity({ query }, req.validated.body.destination, "Destination")
        : undefined;

    const sourceToCompare = (nextSource || existing.rows[0].source).toLowerCase();
    const destinationToCompare = (nextDestination || existing.rows[0].destination).toLowerCase();
    if (sourceToCompare === destinationToCompare) {
      throw badRequest("Source and destination cannot be same");
    }

    const result = await query(
      `UPDATE routes
       SET source = COALESCE($1, source),
           destination = COALESCE($2, destination),
           base_price = COALESCE($3, base_price),
           distance_km = COALESCE($4, distance_km),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6 AND deleted_at IS NULL
       RETURNING *`,
      [nextSource, nextDestination, basePrice, distanceKm, isActive, id]
    );

    await cacheDeleteByPrefix("routes:list:");
    await writeAuditLog({
      actorUserId: req.user.id,
      action: "UPDATE_ROUTE",
      entityType: "ROUTE",
      entityId: id,
      requestId: req.id,
      metadata: req.validated.body
    });

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function deleteRoute(req, res, next) {
  try {
    const { id } = req.validated.params;
    const result = await query(
      `UPDATE routes SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      throw notFound("Route not found");
    }

    await cacheDeleteByPrefix("routes:list:");
    await writeAuditLog({
      actorUserId: req.user.id,
      action: "DELETE_ROUTE",
      entityType: "ROUTE",
      entityId: id,
      requestId: req.id
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
