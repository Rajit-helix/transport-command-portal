import { query } from "../config/db.js";

export async function getUsers(req, res, next) {
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, r.name as role, u.is_active, u.created_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ORDER BY u.created_at DESC`
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(req, res, next) {
  try {
    const result = await query(
      `SELECT id, actor_user_id, action, entity_type, entity_id, request_id, metadata, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 500`
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function analytics(req, res, next) {
  try {
    const [users, bookings, routes, schedules] = await Promise.all([
      query("SELECT COUNT(*)::int as total FROM users"),
      query("SELECT COUNT(*)::int as total FROM bookings"),
      query("SELECT COUNT(*)::int as total FROM routes WHERE deleted_at IS NULL"),
      query("SELECT COUNT(*)::int as total FROM schedules")
    ]);

    res.json({
      data: {
        users: users.rows[0].total,
        bookings: bookings.rows[0].total,
        routes: routes.rows[0].total,
        schedules: schedules.rows[0].total
      }
    });
  } catch (error) {
    next(error);
  }
}
