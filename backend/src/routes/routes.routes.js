import { Router } from "express";
import {
  createBulkRoutes,
  createRoute,
  deleteRoute,
  getRouteById,
  listRoutes,
  updateRoute
} from "../controllers/routes.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { validate } from "../middleware/validate.js";
import {
  createBulkRoutesSchema,
  createRouteSchema,
  listRoutesSchema,
  routeIdSchema,
  updateRouteSchema
} from "../validators/route.validators.js";

const router = Router();

router.get("/", validate(listRoutesSchema), listRoutes);
router.get("/:id", validate(routeIdSchema), getRouteById);
router.post(
  "/bulk",
  requireAuth,
  requirePermission("routes:create"),
  validate(createBulkRoutesSchema),
  createBulkRoutes
);
router.post(
  "/",
  requireAuth,
  requirePermission("routes:create"),
  validate(createRouteSchema),
  createRoute
);
router.put(
  "/:id",
  requireAuth,
  requirePermission("routes:update"),
  validate(updateRouteSchema),
  updateRoute
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission("routes:delete"),
  validate(routeIdSchema),
  deleteRoute
);

export default router;
