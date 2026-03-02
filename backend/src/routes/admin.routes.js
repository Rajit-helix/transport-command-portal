import { Router } from "express";
import { analytics, getAuditLogs, getUsers } from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";

const router = Router();

router.use(requireAuth);
router.get("/users", requirePermission("admin:users:read"), getUsers);
router.get("/audit-logs", requirePermission("admin:audit:read"), getAuditLogs);
router.get("/analytics", requirePermission("admin:analytics:read"), analytics);

export default router;
