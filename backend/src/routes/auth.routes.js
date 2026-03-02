import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  refreshToken,
  register,
  resetPassword
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema
} from "../validators/auth.validators.js";

const router = Router();

router.post("/register", authRateLimit, validate(registerSchema), register);
router.post("/login", authRateLimit, validate(loginSchema), login);
router.post("/refresh", authRateLimit, validate(refreshSchema), refreshToken);
router.post("/forgot-password", authRateLimit, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authRateLimit, validate(resetPasswordSchema), resetPassword);
router.post("/logout", requireAuth, logout);

export default router;
