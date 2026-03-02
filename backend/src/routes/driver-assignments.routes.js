import { Router } from "express";
import {
  createBulkDriverAssignments,
  createDriverAssignment,
  getDriverAssignmentOptions,
  deleteDriverAssignment,
  getDriverAssignmentById,
  listDriverAssignments,
  updateDriverAssignment
} from "../controllers/driver-assignments.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { validate } from "../middleware/validate.js";
import {
  assignmentIdSchema,
  createBulkAssignmentsSchema,
  createAssignmentSchema,
  listAssignmentsSchema,
  updateAssignmentSchema
} from "../validators/assignment.validators.js";

const router = Router();

router.get(
  "/options",
  requireAuth,
  requirePermission("driver_assignments:create"),
  getDriverAssignmentOptions
);
router.get(
  "/",
  requireAuth,
  requirePermission("driver_assignments:read"),
  validate(listAssignmentsSchema),
  listDriverAssignments
);
router.get(
  "/:id",
  requireAuth,
  requirePermission("driver_assignments:read"),
  validate(assignmentIdSchema),
  getDriverAssignmentById
);
router.post(
  "/bulk",
  requireAuth,
  requirePermission("driver_assignments:create"),
  validate(createBulkAssignmentsSchema),
  createBulkDriverAssignments
);
router.post(
  "/",
  requireAuth,
  requirePermission("driver_assignments:create"),
  validate(createAssignmentSchema),
  createDriverAssignment
);
router.put(
  "/:id",
  requireAuth,
  requirePermission("driver_assignments:update"),
  validate(updateAssignmentSchema),
  updateDriverAssignment
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission("driver_assignments:delete"),
  validate(assignmentIdSchema),
  deleteDriverAssignment
);

export default router;
