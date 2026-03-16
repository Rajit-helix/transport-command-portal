# Project Memory: Enterprise Transport App

Last updated: 2026-02-23

## Purpose
Use this file as the first read in future sessions. It captures the current architecture, key paths, and operating commands so you can avoid re-analyzing the whole repo from scratch.

## Maintenance Protocol
- Before making new changes, read `PROJECT_MEMORY.md` first.
- After each completed code/config change, append an entry to `## Change Log` (do not rewrite old entries).
- Keep entries short and concrete: what changed, where, and why.

## Change Log
- 2026-02-20: Created initial memory snapshot for architecture, flows, run modes, and key gotchas.
- 2026-02-23: Fixed auth reliability across run modes: frontend API client now falls back to `/api`, login route handling was tightened for authenticated sessions, and backend register now reads `fullName` correctly so new users can sign in.
- 2026-03-02: Hardened `docker-compose.test.yml` startup and completion: added DB/Redis healthchecks with `depends_on` service health gating, and changed `backend_test` command to `npm test -- --forceExit` so compose test runs terminate instead of hanging after passing suites.
- 2026-03-02: Fixed CORS false-negatives for hostnames with trailing dot (e.g., `http://localhost.`) by normalizing origin hostnames in backend CORS matching logic (`backend/src/app.js`).
- 2026-03-02: Added animated bus-interior themed backgrounds for registration and reset-password pages via shared scene wrappers and new CSS animation layers (`frontend/src/pages/RegisterPage.jsx`, `frontend/src/pages/ResetPasswordPage.jsx`, `frontend/src/styles.css`).
- 2026-03-02: Switched register/reset backgrounds to use a real bus-interior image asset (`frontend/src/assets/bus-interior.png`) with animated parallax/light overlays; rebuilt frontend container and restarted nginx to refresh upstream routing after service recreation.
- 2026-03-16: Hardened local host handling: backend CORS now allows loopback variants in dev; frontend socket/API resolution avoids localhost cross-host issues; Vite proxy derives target from env; Swagger servers use relative `/api`; dev redirect from `localhost.com` to `localhost` (`backend/src/app.js`, `frontend/src/api/client.js`, `frontend/vite.config.js`, `backend/src/swagger.js`, `backend/src/swagger-docs/transport.yaml`, `frontend/src/main.jsx`).
- 2026-03-16: Embedded Postgres now auto-cleans stale `postmaster.pid`/`postmaster.opts` before start to prevent false "did not start" timeouts (`backend/scripts/embedded-postgres.js`).
- 2026-03-16: Added Postgres readiness wait with retry to avoid startup race (`backend/scripts/wait-for-postgres.js`, `scripts/start-app.ps1`).
- 2026-03-16: Start script now detects incompatible existing Postgres on 5432 and falls back to embedded on a free port for reliable local startup (`scripts/start-app.ps1`).

## Repo Layout
- `backend/`: Express API, PostgreSQL access, RBAC, JWT auth, Redis/BullMQ, Socket.IO
- `frontend/`: React + Vite SPA with role-based routes and dashboards
- `nginx/default.conf`: reverse proxy (routes `/api` and `/socket.io` to backend)
- `docker-compose.yml`: local full stack (db, redis, backend, worker, frontend, nginx)
- `docker-compose.test.yml`: isolated test stack
- `.github/workflows/ci.yml`: backend lint/test + frontend lint/build + docker image builds
- `scripts/start-app.ps1`: helper to start embedded Postgres + frontend dev server

## High-Level Architecture
1. Browser loads SPA (`frontend` or proxied through nginx/backend static build).
2. Frontend sends HTTP requests to `/api/*` with JWT bearer token.
3. Express middleware chain enforces request ID, logging, security, sanitization, auth, RBAC permissions, and validation.
4. Controllers execute SQL against Postgres (with transactions where needed), write audit logs, and return JSON.
5. Optional Redis is used for route-list caching and BullMQ notification queue.
6. Socket.IO emits real-time updates for booking and driver-assignment changes.
7. Worker (`backend/src/jobs/notification.worker.js`) consumes notification jobs when Redis is available.

## Backend Core

### Entry and Boot
- `backend/src/server.js`: bootstraps DB ping, optional Redis ping, HTTP server, and Socket.IO init.
- `backend/src/app.js`: middleware + route registration + optional static frontend serving from `frontend/dist`.

### Config
- `backend/src/config/env.js`: strict env validation for required vars:
  - `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `CORS_ORIGINS`
  - optional: `REDIS_URL`, rate limits, SMTP settings, `FRONTEND_URL`
- `backend/src/config/db.js`: pg `Pool`, `query`, `withTransaction`.
- `backend/src/config/redis.js`: optional Redis client (`null` when no URL).
- `backend/src/config/socket.js`: Socket.IO auth via JWT from `socket.handshake.auth.token`.
- `backend/src/config/logger.js`: pino logger with sensitive field redaction.

### Middleware Pipeline (order in `app.js`)
1. `requestId`
2. `requestLogger` (pino-http)
3. `helmet`
4. `cors`
5. `hpp`
6. `express.json`
7. `sanitizeInput` (xss + trim)
8. route handlers
9. `notFoundHandler`
10. `errorHandler`

### API Route Groups
- `backend/src/routes/health.routes.js`: `/health`, `/health/live`, `/health/ready`
- `backend/src/routes/auth.routes.js`: register/login/refresh/forgot/reset/logout
- `backend/src/routes/routes.routes.js`: route browsing + CRUD + bulk insert
- `backend/src/routes/vehicles.routes.js`: vehicle CRUD
- `backend/src/routes/schedules.routes.js`: schedule CRUD
- `backend/src/routes/driver-assignments.routes.js`: assignment CRUD + bulk + options
- `backend/src/routes/bookings.routes.js`: bookings list/read/create/cancel/status
- `backend/src/routes/admin.routes.js`: users, audit logs, analytics

### Auth + RBAC Model
- JWT payload includes `sub`, `role`, `tokenVersion`.
- `requireAuth` fetches active user and checks token version (invalidates all sessions on logout/password reset).
- `requirePermission(permissionName)` checks `role_permissions` table and caches results in-memory.
- Permission list is seeded in migration `backend/migrations/001_init.cjs`.

### Data Model (main tables)
- `roles`, `users`, `permissions`, `role_permissions`
- `vehicles`, `routes`, `schedules`
- `bookings`, `driver_assignments`
- `audit_logs`
- `password_reset_tokens` (migration `002_password_reset_tokens.cjs`)

### Important Domain Behaviors
- Bookings use transaction + `SELECT ... FOR UPDATE` to prevent seat overbooking.
- Dynamic booking price factors:
  - occupancy factor and urgency (<6h departure bump).
- Booking status transitions enforced in `backend/src/services/booking-state.service.js`.
- Route list endpoint caches payload in Redis (`routes:list:*`) for 45s.
- Route/vehicle delete is soft delete (`deleted_at`, `is_active=false`).
- Audit logs written for critical actions via `writeAuditLog`.
- Password reset flow hashes reset token (SHA-256) before DB persistence.

### Async/Realtime
- BullMQ queue name: `notifications`.
- Worker logs processed jobs; exits if Redis is not configured.
- Socket rooms:
  - `driver:{driverId}`
  - `schedule:{scheduleId}`
- Emitted events include:
  - `booking:status`
  - `driver:assignment:update`
  - `driver:status:update`

## Frontend Core

### Entrypoints
- `frontend/src/main.jsx`: `BrowserRouter` + `AuthProvider` + `ErrorBoundary` + toaster.
- `frontend/src/App.jsx`: role-gated route tree and home redirect by role.

### Auth State
- `frontend/src/context/AuthContext.jsx`:
  - stores `user` in localStorage
  - login/register persist access + refresh tokens
  - logout clears tokens and user

### HTTP Client
- `frontend/src/api/client.js`:
  - axios instance with bearer token request interceptor
  - refresh-token retry on 401 (except auth endpoints)
  - shared `refreshInFlight` promise to avoid concurrent refresh storms

### Role Navigation
- `frontend/src/constants/roles.js` drives sidebar links per role.
- `frontend/src/components/ProtectedRoute.jsx` enforces login + allowed role.

### Dev Proxy
- `frontend/vite.config.js` proxies:
  - `/api` -> `http://localhost:4000`
  - `/socket.io` -> `http://localhost:4000` (ws enabled)

## Infra and Run Modes

### Docker Compose (root)
- Services: `db`, `redis`, `backend`, `worker`, `frontend`, `nginx`
- Public entrypoint: `http://localhost` via nginx
- Backend command runs migrations + seed + dev server.

### Local Single-Server Mode
- `backend` can serve built frontend from `frontend/dist` when present.
- Script flow:
  1. `cd backend && npm run start:embedded-db`
  2. `cd backend && npm run migrate:up && npm run seed && npm run start:local`

### Useful Commands
- Backend dev: `cd backend && npm run dev`
- Worker: `cd backend && npm run start:worker`
- Frontend dev: `cd frontend && npm run dev`
- Migrate up/down: `cd backend && npm run migrate:up` / `npm run migrate:down`
- Seed: `cd backend && npm run seed`
- Tests: `cd backend && npm test`

## Testing + CI Snapshot
- Backend tests in `backend/tests/*.test.js` (integration-heavy, Jest + Supertest).
- Coverage thresholds configured in `backend/jest.config.js` (>=80% lines/statements/functions).
- CI runs:
  - backend install, migrate, seed, lint, test
  - frontend install, lint, build
  - docker image build smoke checks

## Known Gotchas / Notes
- `frontend/src/api/client.js` now defaults to `/api`; `VITE_API_BASE_URL` still overrides this and should be set explicitly for cross-origin deployments.
- `cacheDeleteByPrefix` in `backend/src/services/cache.service.js` uses `scanStream` event callbacks and does not await stream completion (best-effort invalidation).
- Socket.IO CORS is currently `origin: "*"`, acceptable for local/dev but review for strict production policy.
- `backend/src/app.js` CORS allowlist includes dynamic same-host `http://localhost:${PORT}` in addition to `CORS_ORIGINS`.

## Fast Re-Orientation Checklist (Future Sessions)
1. Read this file (`PROJECT_MEMORY.md`).
2. Read `README.md` for current run mode expectations.
3. Confirm runtime entrypoints:
   - `backend/src/server.js`
   - `backend/src/app.js`
   - `frontend/src/main.jsx`
   - `frontend/src/App.jsx`
4. Confirm route/controller impacted by requested change under `backend/src/routes` + `backend/src/controllers`.
5. If RBAC-related, check `backend/migrations/001_init.cjs` permissions.
6. If UI nav-related, check `frontend/src/constants/roles.js`.
