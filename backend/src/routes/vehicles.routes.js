import { Router } from "express";
import {
  createVehicle,
  deleteVehicle,
  getVehicleById,
  listVehicles,
  updateVehicle
} from "../controllers/vehicles.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { validate } from "../middleware/validate.js";
import {
  createVehicleSchema,
  listVehiclesSchema,
  updateVehicleSchema,
  vehicleIdSchema
} from "../validators/vehicle.validators.js";

const router = Router();

router.get("/", requireAuth, requirePermission("vehicles:read"), validate(listVehiclesSchema), listVehicles);
router.get("/:id", requireAuth, requirePermission("vehicles:read"), validate(vehicleIdSchema), getVehicleById);
router.post("/", requireAuth, requirePermission("vehicles:create"), validate(createVehicleSchema), createVehicle);
router.put("/:id", requireAuth, requirePermission("vehicles:update"), validate(updateVehicleSchema), updateVehicle);
router.delete(
  "/:id",
  requireAuth,
  requirePermission("vehicles:delete"),
  validate(vehicleIdSchema),
  deleteVehicle
);

export default router;
