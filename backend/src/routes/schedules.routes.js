import { Router } from "express";
import {
  createSchedule,
  deleteSchedule,
  getScheduleById,
  listSchedules,
  updateSchedule
} from "../controllers/schedules.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { validate } from "../middleware/validate.js";
import {
  createScheduleSchema,
  listSchedulesSchema,
  scheduleIdSchema,
  updateScheduleSchema
} from "../validators/schedule.validators.js";

const router = Router();

router.get("/", requireAuth, requirePermission("schedules:read"), validate(listSchedulesSchema), listSchedules);
router.get("/:id", requireAuth, requirePermission("schedules:read"), validate(scheduleIdSchema), getScheduleById);
router.post("/", requireAuth, requirePermission("schedules:create"), validate(createScheduleSchema), createSchedule);
router.put("/:id", requireAuth, requirePermission("schedules:update"), validate(updateScheduleSchema), updateSchedule);
router.delete(
  "/:id",
  requireAuth,
  requirePermission("schedules:delete"),
  validate(scheduleIdSchema),
  deleteSchedule
);

export default router;
