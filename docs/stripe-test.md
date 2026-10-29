# Stripe Checkout TEST-mode foundation (schema v8)

This implementation is disabled by default, accepts **test** API credentials only, and is not an approved payment or license service. It uses Stripe's documented Checkout Sessions and v1 webhook signature format. It handles **only one-time** sandbox orders, not subscriptions, renewals or recurring invoices.

## Required local server configuration

- `STRIPE_TEST_SECRET_KEY` must begin with `sk_test_`.
- `STRIPE_TEST_WEBHOOK_SECRET` must begin with `whsec_` and must match the correct Stripe test endpoint/CLI secret.
- `STRIPE_TEST_SUCCESS_URL` and `STRIPE_TEST_CANCEL_URL` must be trusted return URLs, HTTPS except localhost.
- All four settings must be present. A missing set disables the integration; a partial or live-mode key causes startup to fail closed. Never expose server secrets in the GitHub Pages frontend or `VITE_*` variables.

No network call or test charge is performed until an operator provides valid test credentials and an authenticated user deliberately creates a Stripe test checkout for an eligible sandbox order.

## Workflow

1. Create a **sandbox order** for a published product and active **one-time** plan (`POST /v1/me/test-orders`). Monthly/yearly plans are explicitly rejected, because this integration does not implement subscriptions.
2. `POST /v1/me/stripe-test-checkouts` accepts `{"orderId":"<UUID>"}` for **the current user's own pending sandbox order**. The server loads the stored amount/currency/product name, uses a per-order idempotency key and sends `mode=payment` to `POST https://api.stripe.com/v1/checkout/sessions`. Price amounts or redirects supplied by a browser are ignored/rejected. The Stripe response must be `cs_test_`, `livemode=false` with matching ID, metadata, currency and amount, and a trusted `checkout.stripe.com` URL.
3. The owner can inspect their own Checkout records with `GET /v1/me/stripe-test-checkouts`. The response may include the Stripe **test** Checkout URL.
4. Stripe sends signed test events to `POST /v1/stripe-test/webhook`. The server validates the raw body using HMAC-SHA256 over `<Unix-seconds>.<raw-body>`, the `Stripe-Signature` header's `v1` signature(s), and a five-minute timestamp window.
5. Only recognized test-mode Checkout events with a known session and matching order, user, amount, mode and currency are recorded in `stripe_test_events` (event ID unique) and marked **test_paid_observed** or **expired** on the checkout. Replays return 200; ID conflicts return 409.
6. Crucially, `sandbox_orders` stay unchanged and **no entitlements are issued**. This is **not verified settlement or provider reconciliation**. Even a correctly signed event is not enough to issue commercial access.
7. Admins can inspect sanitized records via `GET /v1/admin/stripe-test-checkouts` and `GET /v1/admin/stripe-test-events`; ordinary customers cannot view other accounts.

## Remaining gates before transactions

- Proper provider account ownership, verified test webhooks, operational monitoring and safe hosted API exposure
- Authoritative Stripe Checkout Session/PaymentIntent fetch before recording reconciled payment
- Tax/invoice/subscription policies, refunds/disputes, pricing revisions, ledger consistency and retry/recovery procedures
- Idempotent payment reconciliation, nonduplicating entitlement issuance after confirmed settlement, and signed software licenses
- Security assessment and real provider test-mode end-to-end trials

**These are test observations, not commercial payment confirmations.** Do not turn this API on with live keys, and do not place customer-facing purchase claims on the Pages preview.

Stripe API references: https://docs.stripe.com/api/checkout/sessions/create and https://docs.stripe.com/events/manage-webhook-endpoints#signature-errors
