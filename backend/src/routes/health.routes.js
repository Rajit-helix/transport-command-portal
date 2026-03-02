import { Router } from "express";
import { health, liveness, readiness } from "../controllers/health.controller.js";

const router = Router();

router.get("/health", health);
router.get("/health/live", liveness);
router.get("/health/ready", readiness);

export default router;
