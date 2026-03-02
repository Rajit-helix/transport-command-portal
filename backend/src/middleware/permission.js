import { query } from "../config/db.js";
import { forbidden, unauthorized } from "../utils/errors.js";

const permissionCache = new Map();

export function requirePermission(permissionName) {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        throw unauthorized("Authentication required");
      }

      const cacheKey = `${req.user.role}:${permissionName}`;
      if (permissionCache.has(cacheKey)) {
        if (!permissionCache.get(cacheKey)) {
          throw forbidden("Insufficient permission");
        }
        return next();
      }

      const result = await query(
        `SELECT 1
         FROM role_permissions rp
         JOIN roles r ON r.id = rp.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE r.name = $1 AND p.name = $2`,
        [req.user.role, permissionName]
      );

      const allowed = result.rowCount > 0;
      permissionCache.set(cacheKey, allowed);

      if (!allowed) {
        throw forbidden("Insufficient permission");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function clearPermissionCache() {
  permissionCache.clear();
}
