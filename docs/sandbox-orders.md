# Sandbox order lifecycle — DMA Hub

**This is a local-development QA workflow only. No payments are collected, no card or bank information is handled, and no commercial license is issued.**

## Workflow

1. Admin creates a published product and an active USD pricing plan.
2. An authenticated customer sends `POST /v1/me/test-orders` with `{planId, idempotencyKey}` (8–80 safe characters). The API snapshots the plan amount/currency/period and creates a **pending** sandbox order. Idempotency is scoped per customer; retries return the same order. A key reused for a different plan returns 409.
3. `GET /v1/me/test-orders` shows only the authenticated user's sandbox orders. Creating an order **does not grant access**.
4. An authorized admin inspects `GET /v1/admin/test-orders` and explicitly calls `POST /v1/admin/test-orders/:uuid/fulfill`. This succeeds only for a pending order, enabled account, published product, active plan and no overlapping active grant.
5. Fulfillment atomically creates a **30-day sandbox** entitlement with `source: "sandbox_order"`, marks the order `test_fulfilled`, and records two audit entries. Repeating fulfillment returns the existing entitlement without creating duplicates.
6. Admin can call `POST /v1/admin/test-orders/:uuid/cancel` on a pending order. Cancellation is idempotent and cannot undo fulfilled access; use the existing entitlement revoke endpoint to revoke access.

All order IDs, prices, status and entitlement links are generated/stored server-side. The customer **cannot** mark orders paid, fulfill their own orders, or request production entitlement issuance. `sandboxOnly: true` appears in all order API replies.

## Security and migration

Schema v6 creates `sandbox_orders` with a unique `(user_id,idempotency_key)` constraint and upgrades the entitlement source constraint to distinguish `admin_test_grant` from `sandbox_order`. Existing manual grants and profiles are preserved. The SQLite online backup verification checks the new table. This migration does not enable a payment processor.

## What's still required before real commerce

- Hosted production API with TLS, abuse controls, operational monitoring, backups and recovery
- Merchant contract, tax policy, price effective dates and currency handling
- Server-side payment-provider API and purchase intent
- Signature-verified, timestamped and **idempotent payment webhooks**, replay prevention and event reconciliation
- Payment-confirmed entitlements, invoices/receipts, refunds, disputes and cancellation state machine
- Signed licenses, permitted device activation, and actual software delivery entitlement checks
- Admin audit review and tested customer support flows

Do not represent sandbox fulfillment as payment confirmation or production entitlement fulfillment.
