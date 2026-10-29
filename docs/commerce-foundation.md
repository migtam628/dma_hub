# Pricing plans and test entitlements — DMA Hub API

This milestone adds **persistent plan definitions and manually issued test entitlements**. No checkout, subscription charge, transaction, automatic grant, device activation, signed license, or payment webhook exists.

## Public pricing

`GET /v1/catalog/pricing` returns only **active plans on published catalog products**, with a safe integer `amountMinor`, `currency: "USD"` and one of `one_time`, `monthly`, `yearly`. Amounts represent **catalog configuration**, not a live offer for payment. A plan does not grant access.

The existing `GET /v1/catalog` remains labeled demo; `GET /v1/catalog/live` remains the published persistent product catalog. The public Pages storefront is still a demo until a hosted API is secured and explicitly connected.

## Admin-only operations

Admin role comes from a controlled offline process; public registration cannot assign it.

- `GET/POST /v1/admin/products/:uuid/plans` — list/create plans for a specific product.
- `GET/PATCH /v1/admin/plans/:uuid` — read/update a plan; PATCH needs numeric `If-Match` version and changes **only name and status**. Price, currency and billing period cannot mutate after a plan is created.
- `GET/POST /v1/admin/entitlements` — list or manually issue a test entitlement to an existing, enabled customer; product must be published, plan active and belong to that product.
- `POST /v1/admin/entitlements/:uuid/revoke` — revoke; idempotent, with one audit event for first revocation.

A grant body includes `{userId,productId,planId,expiresAt,startsAt?}` (Unix **milliseconds**). Expiry is required; max duration 366 days, starts within the permitted server window. Overlapping active grants for a user/product are rejected. Grants are recorded exclusively as `source: "admin_test_grant"` and never mistaken for a purchase. No customer endpoint can request grants.

All plan writes and entitlement grant/revocation operations are transactionally recorded with `actor` in `audit`.

## Authenticated customer checks

- `GET /v1/me/entitlements` — returns only the authenticated account's grants. Each entry reports `accessStatus` (`active`, `scheduled`, `expired`, `revoked`, `product_unavailable`), never any other customer's entitlement.
- `GET /v1/me/access/:productUuid` — server evaluates current entitlement state and start/expiry plus product publication. Returns `allowed: false` without a valid active grant.

An existing grant remains valid if its plan is later archived, **but access is denied when the product is unpublished/archived**, or when the grant is revoked or expired. This is temporary test behavior; legal/commercial fulfillment policies must be defined before production.

## Remaining commercial/security requirements

Production pricing version history, checkout intent, tax/currency handling, fraud controls, payment processor, signed/idempotent webhooks, refunds, revocable signed licenses, device activation policy, customer support, admin UI, independent security review, and reliable hosted API. No public revenue or entitlement claims should be made based on these test records.


## Sandbox checkout QA (schema v6)

The next backend milestone adds idempotent, authenticated customer test orders and explicit admin-only sandbox fulfillment/cancellation. Fulfillment creates a **30-day** entitlement with source `sandbox_order`; it is not evidence of payment. Review [Sandbox order lifecycle](sandbox-orders.md). Real payment intents, signed webhooks, subscription reconciliation and production licensing remain out of scope.


## Test-only signed event ingestion (schema v7)

Development-mode HMAC sandbox webhook ingestion and deduplicated metadata are now available without a real processor. See [signed sandbox webhook inbox](sandbox-webhook.md). Receipt of a signed test event does **not** mean the order is paid and cannot issue an entitlement.

## Stripe test-mode adapter (schema v8)

A server-only, opt-in Stripe Checkout (one-time sandbox orders) and signature-verified webhook observation inbox now exist; see [Stripe test-mode reference](stripe-test.md). Customer order price, plan status and ownership are checked in the database. Test Checkout URLs and event IDs are recorded separately, with **no entitlement issuance** from webhook acceptance. Provider reconciliation and production billing remain unimplemented.


## Read-only Stripe TEST reconciliation history (schema v9)

Verified test-session reads are now recorded as deduplicated normalized status snapshots, with admin-only history retrieval. This is an inspectable QA history, **not** a transaction ledger or evidence of real settled funds. See [reconciliation history](stripe-test-reconciliation-history.md).
