# Provider-neutral commerce review cases (SQLite v12)

This is a **local-development, test-only operational review queue** for existing sandbox orders. It is **not** a financial ledger, evidence of settlement, provider authorization, refund processing, payment confirmation, or a commercial license issuer. It makes no external network calls.

## Model

- One case per sandbox order. The admin submits a unique 8–80-character idempotency key; an identical retry returns the original case, while a conflicting retry is rejected.
- Provider context is `sandbox` or `stripe_test`. The Stripe context requires an existing local test Checkout record, **not** a verified payment. Provider-specific payloads and credentials are never stored.
- Reasons: `payment_question`, `test_checkout_mismatch`, `test_event_disagreement`, `other`.
- States: `open`, `investigating`, `closed_unverified`, `closed_test_only`. There is deliberately no `paid`, `settled`, `refunded`, or `license_issued` state.
- Each transition requires an integer `If-Match` version. A stale version fails with HTTP 409. Transitions are recorded in a separate immutable event table, with database triggers rejecting UPDATE/DELETE.
- Every creation and transition also creates an existing admin audit entry within the same transaction.

## API (authenticated, local only)

`GET /v1/me/commerce-reviews`: owner-scoped, sanitized status list; never returns staff IDs, provider context, or internal reasons.

`GET /v1/admin/commerce-reviews`: admin-only bounded queue, at most 100 cases.

`POST /v1/admin/commerce-reviews`: admin-only creation, e.g.
```json
{"orderId":"<sandbox-order-uuid>","idempotencyKey":"review_case_1234","provider":"sandbox","reason":"payment_question"}
```

`GET /v1/admin/commerce-reviews/:uuid`: admin-only case and last 100 immutable transitions.

`PATCH /v1/admin/commerce-reviews/:uuid` with `If-Match: 1` and `{"state":"investigating"}`: admin-only status transition. Closed cases may only reopen to `open`; reopening is not a payment event.

Responses explicitly include `testOnly:true`, `settlementVerified:false`, and `accessGranted:false`. No review endpoint can change sandbox order state or create entitlements. SQLite v12 tables are included in backup integrity checks.

## Production gates still required

Provider-neutral **financial** ledger design, actual processor test-account evidence, signed webhook delivery/verification, amount/currency and tax reconciliation, idempotent retries, refunds/disputes, anti-fraud review, secure deployment, independent compliance/security review, and separately approved real payment-to-license activation. Do not expose the local API publicly or treat a closed review case as payment proof.
