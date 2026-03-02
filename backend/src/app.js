import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import hpp from "hpp";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { requestId } from "./middleware/request-id.js";
import { requestLogger } from "./middleware/request-logger.js";
import { sanitizeInput } from "./middleware/sanitize.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import routesRoutes from "./routes/routes.routes.js";
import citiesRoutes from "./routes/cities.routes.js";
import vehiclesRoutes from "./routes/vehicles.routes.js";
import schedulesRoutes from "./routes/schedules.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import driverAssignmentsRoutes from "./routes/driver-assignments.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { swaggerSpec } from "./swagger.js";

export const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");

function normalizeOrigin(origin) {
  if (!origin) return origin;
  try {
    const parsed = new URL(origin);
    const normalizedHost = parsed.hostname.replace(/\.+$/, "");
    const normalizedPort = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.protocol}//${normalizedHost}${normalizedPort}`;
  } catch {
    return origin;
  }
}

app.set("trust proxy", 1);

app.use(requestId);
app.use(requestLogger);
app.use(
  helmet({
    contentSecurityPolicy: env.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"]
          }
        }
      : false
  })
);
app.use(
  cors({
    origin(origin, callback) {
      const sameHostOrigin = `http://localhost:${env.port}`;
      const normalizedOrigin = normalizeOrigin(origin);
      const allowedOrigins = env.corsOrigins.map((value) => normalizeOrigin(value));
      const normalizedSameHostOrigin = normalizeOrigin(sameHostOrigin);

      if (
        !origin ||
        allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin === normalizedSameHostOrigin
      ) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  })
);
app.use(hpp());
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeInput);

app.use("/api", healthRoutes);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/routes", routesRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/driver-assignments", driverAssignmentsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/admin", adminRoutes);

// Root route for health/status
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// Serve built frontend from backend in local/prod single-server mode.
if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
