# DMA Hub API v0.2 — local development

The backend is a Node 22 HTTP + SQLite service. Requires a secure private deployment configuration and reverse proxy before exposure. No billing, user licensing, email verification, or production hardening is claimed.

Run `npm run dev:api` from the repository root, optionally set environment variables from `apps/api/.env.example`. Default is loopback port 8787 with a persistent database in the app working directory. For Vite's browser dev origin `http://localhost:5173`, configure `WEB_ORIGIN=http://localhost:5173`. Do **not** expose this local prototype directly to the internet.

Endpoints:
- `GET /healthz` — status; unauthenticated
- `GET /v1/catalog` — preview catalog
- `POST /v1/auth/register` — email + 12–128 character password; creates customer
- `POST /v1/auth/login` — email/password, returns 12-hour opaque Bearer token
- `POST /v1/auth/logout` — revokes current token
- `GET /v1/me` — current session
- `GET /v1/profiles` — current user's profiles (max 100)
- `POST /v1/profiles` — create {name,data}
- `GET /v1/profiles/:id` — fetch owned profile
- `PATCH /v1/profiles/:id` — update {name,data}, require `If-Match: 1` (numeric version)
- `DELETE /v1/profiles/:id` — remove, require numeric `If-Match`
- `GET /v1/admin/metrics` — restricted to admin role; no role assignment publicly exposed.

Security implemented: scrypt salted passwords, hashed opaque tokens, 12-hour sessions, CORS origin allowlist, max JSON body, tenant-scoped SQL, profile optimistic concurrency, no-store headers, no remote admin self-promotion, audit records, simple in-memory login rate limiting.

Before internet exposure: enforce TLS + secure proxy, add email verification and credential resets, stronger distributed rate limiting, structured logs and alerts, account abuse monitoring, database backups/migrations, secrets management, integration tests through reverse proxy, threat model, security review and dependency audit.
