# DMA Hub API v0.2 — local development

The backend is a Node 22 HTTP + SQLite service. Requires a secure private deployment configuration and reverse proxy before exposure. No billing, user licensing or production hardening is claimed. Email verification and recovery require an explicitly configured transactional mail provider.

Run `npm run dev:api` from the repository root, optionally set environment variables from `apps/api/.env.example`. Default is loopback port 8787 with a persistent database in the app working directory. For Vite's browser dev origin `http://localhost:5173`, configure `WEB_ORIGIN=http://localhost:5173`. Do **not** expose this local prototype directly to the internet.

Endpoints:
- `GET /healthz` — status; unauthenticated
- `GET /v1/catalog` — preview catalog
- `GET /v1/catalog/live` — published persisted catalog products only, including documented category/features/requirements
- `GET /v1/catalog/live/:slug` — published-only product details, 404 for draft/archived/missing records
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
- `GET /v1/admin/audit?offset=0&limit=50` — admin-only read-only audit list with bounded pagination; no credentials returned

Security implemented: scrypt salted passwords, hashed opaque tokens, 12-hour sessions, CORS origin allowlist, max JSON body, tenant-scoped SQL, profile optimistic concurrency, no-store headers, no remote admin self-promotion, audit records, SQLite-backed fixed-window throttling for registration/login/recovery/verification/password changes, a maximum of five active sessions per user, expired-session cleanup, session inventory/revoke-all, and oversized-body handling with HTTP 413.

Before internet exposure: enforce TLS + secure proxy, add email verification and recovery, stronger distributed rate limiting, structured logs and alerts, account abuse monitoring, encrypted off-host backups, secrets management, integration tests through reverse proxy, threat model, security review and dependency audit. Manual database migrations and backup verification are described in [database recovery](database-recovery.md).

**Current limitations:** Throttling is persisted in one SQLite database and shared only by processes using that same file, not across independent hosts or database replicas. Registration verification is opt-in and depends on a configured transactional-mail provider. The API remains local-development only; do not publish it on a public interface. See [persistent rate limiter](rate-limiting.md).

**Commerce foundation:** schema v5 adds plan amounts (USD cents) and time-limited test grants. The admin must grant access manually. Payment, purchases, license enforcement, signed activation and billing webhooks remain unimplemented. See [commerce foundation](commerce-foundation.md).

**Sandbox orders (v6):** Test-only checkout intent snapshots a plan amount, with an owner-scoped idempotency key; explicit admin fulfillment issues one 30-day sandbox entitlement and audit records. Payment acceptance, subscription charges and commercial licensing remain **unimplemented**. See [Sandbox order lifecycle](sandbox-orders.md).

## Signed sandbox event inbox (v7)

- `POST /v1/test-webhooks/payments` — **test only**; requires server-configured HMAC secret, fresh timestamp and valid raw-body signature. Never changes payment/entitlement status.
- `GET /v1/admin/test-webhooks` — authenticated admin-only sanitized event metadata, last 100 items.

See [sandbox webhook documentation](sandbox-webhook.md). This is **not** a merchant payment provider or verified settlement flow.

## Stripe Checkout test-mode API (schema v8)

- `GET /v1/stripe-test/capabilities` — indicates whether all four server-only Stripe test settings are configured.
- `POST /v1/me/stripe-test-checkouts` — authenticated owner may open a Stripe **test** Checkout Session for an eligible one-time sandbox order (`{orderId}`); creates server-side price lines and an idempotent Stripe request.
- `GET /v1/me/stripe-test-checkouts` — current user's test Checkout history.
- `POST /v1/stripe-test/webhook` — Stripe `Stripe-Signature` v1 verified over the raw request body; stores test observations only.
- `GET /v1/admin/stripe-test-checkouts` and `GET /v1/admin/stripe-test-events` — sanitized read-only internal queue.

See [Stripe test-mode integration](stripe-test.md). No live charges, subscriptions, automatic entitlements, payment-to-license conversion or real provider reconciliation are implemented.

- `POST /v1/admin/stripe-test-checkouts/:checkoutUuid/reconcile` — admin-only explicit read-only authoritative Stripe **TEST** Checkout Session lookup; validates amount, order, account and mode; audited; **never grants access or records settlement**. Disabled without test credentials. See [Stripe TEST guide](stripe-test.md).

## Durable Stripe TEST observation history (schema v9)

- `POST /v1/admin/stripe-test-checkouts/:uuid/reconcile` — admin-only Stripe test provider lookup; if validated, stores a normalized deduplicated test-state snapshot.
- `GET /v1/admin/stripe-test-checkouts/:uuid/observations?limit=30` — admin-only snapshot history (up to 50). Excludes raw provider payloads, email addresses and credentials.

**Not a financial settlement ledger.** Every response explicitly denies commercial settlement and access issuance. See [reconciliation history](stripe-test-reconciliation-history.md).

## SQLite-backed rate limiting (schema v10)

Registration, login (IP and normalized email), verification, password recovery, and password-change attempts use atomic persisted SQLite buckets that survive API restarts. Exceeded limits return 429. Keys are SHA-256 hashes; plaintext IP/email strings do not enter the limiter table. This is **not distributed protection across independent databases**. See [rate-limit documentation](rate-limiting.md).

## Administrator security monitoring

- `GET /v1/admin/security` — authenticated admin-only aggregate rate-limit scope counts and preceding-24-hour successful authentication audit counts, with no bucket hashes or raw IP/email identifiers. Fields `distributedAcrossHosts:false` and `productionSecurityApproved:false` are explicit.

See [security monitoring](security-monitoring.md) for limitations. This is not a distributed threat-monitoring system.

## Catalog metadata (local development API, schema v11)

Each product record supports `category`: `unspecified | software | hardware | cloud`, `features: string[]`, and `requirements: string[]`. Each array is limited to 10 unique entries (1–140 characters; no control characters). Unsupported values produce HTTP 422. Public records include these fields only for published products, without admin-only version or status. `PATCH /v1/admin/products/:id` retains existing metadata when an older client omits the new fields. Both creation and edits remain admin-only and audited.


## Provider-neutral sandbox commerce review cases (schema v12)

- `GET /v1/me/commerce-reviews` — authenticated, owner-scoped sanitized test review statuses.
- `GET/POST /v1/admin/commerce-reviews` — admin-only bounded queue and idempotent case creation for existing sandbox orders.
- `GET/PATCH /v1/admin/commerce-reviews/:uuid` — admin-only immutable event history and version-checked status changes; `PATCH` requires numeric `If-Match`.
- States are only `open`, `investigating`, `closed_unverified`, `closed_test_only`; none establishes settlement or grants access.

See [commerce review workflow](commerce-reviews.md). These endpoints are local-only and **do not** implement a financial ledger or real payment processing.

## Game compatibility review API (local development only, schema v14)

- `GET /v1/games/:gameId/compatibility`: read-only operator-reviewed compatibility records with `gameBuild`, `platform`, `hardware`, `reviewedAt` and `evidenceOnFile`. Never returns internal evidence links, staff IDs, drafts, withdrawals, archived products or stale product versions. An unknown game returns 404.
- `GET /v1/admin/game-compatibility`: admin-only review queue.
- `POST /v1/admin/game-compatibility`: admin-only draft creation with `{productId,gameId,gameBuild,platform,hardware,evidenceRef}`. The product must be software associated with the game; game build syntax is bounded and platform is explicitly Windows 10/11.
- `PATCH /v1/admin/game-compatibility/:id`: admin-only `{state}` transition requiring numeric `If-Match`. Only a published, still-associated, unchanged product with an HTTPS evidence reference can be reviewed. Reset to draft after changes to re-attest. All transitions create immutable events and audit records.

An operator attestation is not independent compatibility certification and grants no downloads, access rights, licenses, or payment settlement. Public route requires no auth, but local SQLite API is not Internet-hosted.
