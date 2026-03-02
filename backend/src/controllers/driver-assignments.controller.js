import { query } from "../config/db.js";
import { getPagination } from "../utils/pagination.js";
import { conflict, notFound } from "../utils/errors.js";
import { writeAuditLog } from "../services/audit.service.js";
import { getIo } from "../config/socket.js";

export async function listDriverAssignments(req, res, next) {
  try {
    const q = req.validated.query || {};
    const { page, limit, offset } = getPagination(q);

    const values = [];
    const where = [];

    if (q.driverId) {
      values.push(q.driverId);
      where.push(`da.driver_id = $${values.length}`);
    }
    if (q.scheduleId) {
      values.push(q.scheduleId);
      where.push(`da.schedule_id = $${values.length}`);
    }
    if (q.assignmentStatus) {
      values.push(q.assignmentStatus);
      where.push(`da.assignment_status = $${values.length}`);
    }

    if (req.user.role === "DRIVER") {
      values.push(req.user.id);
      where.push(`da.driver_id = $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    values.push(limit);
    values.push(offset);

    const data = await query(
      `SELECT da.*, u.full_name as driver_name, s.departure_time, s.arrival_time,
              r.source, r.destination
       FROM driver_assignments da
       JOIN users u ON u.id = da.driver_id
       JOIN schedules s ON s.id = da.schedule_id
       JOIN routes r ON r.id = s.route_id
       ${whereSql}
       ORDER BY da.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    const countValues = values.slice(0, values.length - 2);
    const count = await query(
      `SELECT COUNT(*)::int as total FROM driver_assignments da ${whereSql}`,
      countValues
    );

    res.json({ data: data.rows, pagination: { page, limit, total: count.rows[0].total } });
  } catch (error) {
    next(error);
  }
}

export async function getDriverAssignmentById(req, res, next) {
  try {
    const result = await query("SELECT * FROM driver_assignments WHERE id = $1", [req.validated.params.id]);
    if (result.rowCount === 0) {
      throw notFound("Assignment not found");
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function createDriverAssignment(req, res, next) {
  try {
    const { driverId, scheduleId } = req.validated.body;

    const driver = await query(
      `SELECT u.id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND r.name = 'DRIVER' AND u.is_active = TRUE`,
      [driverId]
    );

    if (driver.rowCount === 0) {
      throw notFound("Driver not found");
    }

    const created = await query(
      `INSERT INTO driver_assignments (driver_id, schedule_id)
       VALUES ($1, $2)
       ON CONFLICT(driver_id, schedule_id) DO NOTHING
       RETURNING *`,
      [driverId, scheduleId]
    );

    if (created.rowCount === 0) {
      throw conflict("Driver already assigned to schedule");
    }

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "CREATE_DRIVER_ASSIGNMENT",
      entityType: "DRIVER_ASSIGNMENT",
      entityId: created.rows[0].id,
      requestId: req.id,
      metadata: created.rows[0]
    });

    res.status(201).json({ data: created.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function createBulkDriverAssignments(req, res, next) {
  try {
    const { driverId, scheduleIds } = req.validated.body;
    const uniqueScheduleIds = [...new Set(scheduleIds)];

    const driver = await query(
      `SELECT u.id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND r.name = 'DRIVER' AND u.is_active = TRUE`,
      [driverId]
    );

    if (driver.rowCount === 0) {
      throw notFound("Driver not found");
    }

    const created = [];
    const conflicts = [];

    for (const scheduleId of uniqueScheduleIds) {
      const inserted = await query(
        `INSERT INTO driver_assignments (driver_id, schedule_id)
         VALUES ($1, $2)
         ON CONFLICT(driver_id, schedule_id) DO NOTHING
         RETURNING *`,
        [driverId, scheduleId]
      );

      if (inserted.rowCount === 0) {
        conflicts.push(scheduleId);
      } else {
        created.push(inserted.rows[0]);
      }
    }

    for (const item of created) {
      await writeAuditLog({
        actorUserId: req.user.id,
        action: "CREATE_DRIVER_ASSIGNMENT",
        entityType: "DRIVER_ASSIGNMENT",
        entityId: item.id,
        requestId: req.id,
        metadata: item
      });
    }

    res.status(201).json({
      data: {
        createdCount: created.length,
        conflictCount: conflicts.length,
        created,
        conflicts
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDriverAssignment(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { assignmentStatus } = req.validated.body;

    const result = await query(
      `UPDATE driver_assignments
       SET assignment_status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [assignmentStatus, id]
    );

    if (result.rowCount === 0) {
      throw notFound("Assignment not found");
    }

    const io = getIo();
    if (io) {
      io.to(`driver:${result.rows[0].driver_id}`).emit("driver:assignment:update", result.rows[0]);
      io.to(`schedule:${result.rows[0].schedule_id}`).emit("driver:status:update", result.rows[0]);
    }

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "UPDATE_DRIVER_ASSIGNMENT",
      entityType: "DRIVER_ASSIGNMENT",
      entityId: id,
      requestId: req.id,
      metadata: req.validated.body
    });

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function deleteDriverAssignment(req, res, next) {
  try {
    const { id } = req.validated.params;
    const result = await query("DELETE FROM driver_assignments WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) {
      throw notFound("Assignment not found");
    }

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "DELETE_DRIVER_ASSIGNMENT",
      entityType: "DRIVER_ASSIGNMENT",
      entityId: id,
      requestId: req.id
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getDriverAssignmentOptions(_req, res, next) {
  try {
    const [drivers, schedules] = await Promise.all([
      query(
        `SELECT u.id, u.full_name, u.email
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.name = 'DRIVER' AND u.is_active = TRUE
         ORDER BY u.full_name ASC`
      ),
      query(
        `SELECT s.id, s.departure_time, s.arrival_time, s.available_seats, s.status,
                r.source, r.destination,
                COALESCE(da.total_assigned, 0)::int AS total_assigned
         FROM schedules s
         JOIN routes r ON r.id = s.route_id
         LEFT JOIN (
           SELECT schedule_id, COUNT(*) AS total_assigned
           FROM driver_assignments
           GROUP BY schedule_id
         ) da ON da.schedule_id = s.id
         WHERE s.departure_time >= NOW() - INTERVAL '2 hours'
         ORDER BY s.departure_time ASC
         LIMIT 200`
      )
    ]);

    res.json({
      data: {
        drivers: drivers.rows,
        schedules: schedules.rows
      }
    });
  } catch (error) {
    next(error);
  }
}
