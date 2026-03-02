import { Router } from "express";
import { createCity, listCities, updateCity } from "../controllers/cities.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { validate } from "../middleware/validate.js";
import { createCitySchema, listCitiesSchema, updateCitySchema } from "../validators/city.validators.js";

const router = Router();

router.get("/", requireAuth, requirePermission("routes:create"), validate(listCitiesSchema), listCities);
router.post("/", requireAuth, requirePermission("routes:create"), validate(createCitySchema), createCity);
router.put("/:id", requireAuth, requirePermission("routes:update"), validate(updateCitySchema), updateCity);

export default router;
