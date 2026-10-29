# DMA Hub API v0.2 — local development

The backend is a Node 22 HTTP + SQLite service. Requires a secure private deployment configuration and reverse proxy before exposure. No billing, user licensing or production hardening is claimed. Email verification and recovery require an explicitly configured transactional mail provider.

Run `npm run dev:api` from the repository root, optionally set environment variables from `apps/api/.env.example`. Default is loopback port 8787 with a persistent database in the app working directory. For Vite's browser dev origin `http://localhost:5173`, configure `WEB_ORIGIN=http://localhost:5173`. Do **not** expose this local prototype directly to the internet.

Endpoints:
- `GET /healthz` — status; unauthenticated
- `GET /v1/catalog` — preview catalog
- `GET /v1/catalog/live` — published persisted catalog products only
- `GET /v1/catalog/pricing` — active USD plan prices for published products; no payment flow
- `GET/POST /v1/me/test-orders` — authenticated, owner-scoped **sandbox** order list/create; idempotent retries
- `GET /v1/admin/test-orders` — admin-only QA order queue
- `POST /v1/admin/test-orders/:uuid/fulfill` — explicit admin-only, idempotent **test** fulfillment, not a payment
- `POST /v1/admin/test-orders/:uuid/cancel` — cancel a pending QA order; never revoke fulfilled access
- `GET/POST /v1/admin/products/:uuid/plans` — admin-only plan list/create
- `GET/PATCH /v1/admin/plans/:uuid` — admin-only plan metadata; price/currency/period immutable, update needs `If-Match`
- `GET/POST /v1/admin/entitlements` — admin-only listing/explicit test grants, not purchases
- `POST /v1/admin/entitlements/:uuid/revoke` — audit-recorded test grant revocation
- `GET /v1/me/entitlements` — only signed-in customer's test grants
- `GET /v1/me/access/:productUuid` — server-evaluated active access check
- `GET/POST /v1/admin/products` — admin-only catalog listing and creation; authenticated
- `GET/PATCH /v1/admin/products/:uuid` — admin-only retrieval/update; PATCH requires numeric `If-Match`
- `POST /v1/auth/register` — email + 12–128 character password; creates customer
- `POST /v1/auth/login` — email/password, returns 12-hour opaque Bearer token
- `GET /v1/auth/capabilities` — email-verification and recovery availability flags
- `POST /v1/auth/verify-email` — consume a single-use 24-hour email token
- `POST /v1/auth/request-verification` — request a verification code; generic response
- `POST /v1/auth/forgot-password` — request a one-hour password recovery code; generic response
- `POST /v1/auth/reset-password` — consume recovery token and revoke all active sessions
- `POST /v1/auth/logout` — revokes current token
- `GET /v1/auth/sessions` — list active sessions (timestamps and current marker; raw tokens never exposed)
- `POST /v1/auth/logout-all` — revoke every active session for the user
- `POST /v1/auth/change-password` — requires current and new password; on success revokes all sessions and creates an audit record
- `GET /v1/me` — current session
- `GET /v1/profiles` — current user's profiles (max 100)
- `POST /v1/profiles` — create {name,data}
- `GET /v1/profiles/:id` — fetch owned profile
- `PATCH /v1/profiles/:id` — update {name,data}, require `If-Match: 1` (numeric version)
- `DELETE /v1/profiles/:id` — remove, require numeric `If-Match`
- `GET /v1/admin/metrics` — restricted to admin role; no role assignment publicly exposed.

Security implemented: scrypt salted passwords, hashed opaque tokens, 12-hour sessions, CORS origin allowlist, max JSON body, tenant-scoped SQL, profile optimistic concurrency, no-store headers, no remote admin self-promotion, audit records, simple in-memory registration/login throttling, a maximum of five active sessions per user, expired-session cleanup, session inventory/revoke-all, and oversized-body handling with HTTP 413.

Before internet exposure: enforce TLS + secure proxy, add email verification and recovery, stronger distributed rate limiting, structured logs and alerts, account abuse monitoring, encrypted off-host backups, secrets management, integration tests through reverse proxy, threat model, security review and dependency audit. Manual database migrations and backup verification are described in [database recovery](database-recovery.md).

**Current limitations:** The rate limits are process-local and are not sufficient against distributed abuse; registration has no email verification; the API remains suitable only for local development. Do not publish it on a public interface.

**Commerce foundation:** schema v5 adds plan amounts (USD cents) and time-limited test grants. The admin must grant access manually. Payment, purchases, license enforcement, signed activation and billing webhooks remain unimplemented. See [commerce foundation](commerce-foundation.md).

**Sandbox orders (v6):** Test-only checkout intent snapshots a plan amount, with an owner-scoped idempotency key; explicit admin fulfillment issues one 30-day sandbox entitlement and audit records. Payment acceptance, subscription charges and commercial licensing remain **unimplemented**. See [Sandbox order lifecycle](sandbox-orders.md).
