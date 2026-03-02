import { logger } from "../config/logger.js";
import { AppError } from "../utils/errors.js";

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "ROUTE_NOT_FOUND"));
}

export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  logger.error(
    {
      error: err.message,
      stack: err.stack,
      code,
      path: req.originalUrl,
      method: req.method,
      requestId: req.id
    },
    "Request failed"
  );

  res.status(status).json({
    message: err.message || "Internal server error",
    code,
    details: err.details || null
  });
}
