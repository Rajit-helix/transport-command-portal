# Enterprise Transport App

## Architecture
- Backend: Node.js + Express + PostgreSQL + JWT + Permission-based RBAC
- Frontend: React + Vite + React Router + React Hook Form + Zod
- Cache/Queue: Redis + BullMQ
- Realtime: Socket.io
- API Docs: Swagger/OpenAPI
- Infrastructure: Docker Compose, Nginx reverse proxy, GitHub Actions CI

## Security Baseline
- Permission-based authorization (`permissions` + `role_permissions` in DB)
- JWT access/refresh token flow
- Request sanitization + parameterized SQL queries
- Helmet + CORS hardening + HPP
- Rate limiting on auth + booking endpoints
- Structured DB audit logs with request IDs

## Development Run
```bash
# from project root
docker compose up --build
```

Endpoints:
- App: `http://localhost:5173`
- API: `http://localhost/api`
- Swagger: `http://localhost/api/docs`
- Health: `http://localhost/api/health`
- Readiness: `http://localhost/api/health/ready`
- Liveness: `http://localhost/api/health/live`

## Local Single-Server Run (No separate frontend dev server)
Use this mode if you want clients to open the UI without restarting Vite.

```bash
# terminal 1
cd backend
npm run start:embedded-db

# terminal 2
cd backend
npm run migrate:up
npm run seed
npm run start:local
```

Endpoints in this mode:
- App + API (single server): `http://localhost:4000`
- Swagger: `http://localhost:4000/api/docs`

## Test Run
```bash
# spin isolated test stack
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

Local backend tests:
```bash
cd backend
npm install
npm run migrate:up
npm run seed
npm test
```

Coverage threshold is enforced in `backend/jest.config.js` (>= 80% lines/statements/functions).

## Production Run
1. Copy production templates:
```bash
cp .env.production.example .env.production
cp backend/.env.production.example backend/.env
```
2. Set strong secrets and production DB/Redis URLs.
3. Build and start:
```bash
docker compose --env-file .env.production up --build -d
```

## HTTPS Instructions
- Terminate TLS at Nginx or upstream load balancer.
- For Nginx in production, add:
  - `listen 443 ssl;`
  - `ssl_certificate /etc/nginx/certs/fullchain.pem;`
  - `ssl_certificate_key /etc/nginx/certs/privkey.pem;`
- Redirect HTTP -> HTTPS with `return 301 https://$host$request_uri;`.

## Secrets Management Strategy
- Do not commit real secrets.
- Use one of:
  - Docker Swarm/Kubernetes secrets
  - Cloud secret manager (AWS Secrets Manager / GCP Secret Manager / Azure Key Vault)
  - Vault with runtime injection
- Inject secrets via environment variables at deploy time.

## Default Seed Credentials
- `admin@transport.local / Password@123`
- `manager@transport.local / Password@123`
- `driver@transport.local / Password@123`
- `customer@transport.local / Password@123`

## Migrations
```bash
cd backend
npm run migrate:up
npm run migrate:down
```

## Worker
```bash
cd backend
npm run start:worker
```

PR protection check marker: 2026-03-03 02:19:32
