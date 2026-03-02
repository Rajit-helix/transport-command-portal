import { verifyToken } from "../utils/jwt.js";
import { query } from "../config/db.js";
import { unauthorized } from "../utils/errors.js";

export async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw unauthorized("Missing or invalid Authorization header");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.token_version, r.name as role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [decoded.sub]
    );

    if (result.rowCount === 0) {
      throw unauthorized("User no longer active");
    }

    const user = result.rows[0];
    if (decoded.tokenVersion !== user.token_version) {
      throw unauthorized("Session is invalidated");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : unauthorized("Invalid or expired token"));
  }
}
