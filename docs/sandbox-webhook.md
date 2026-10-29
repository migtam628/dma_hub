# Signed sandbox webhook inbox — local QA only

**This is not a payment-provider integration.** It does not accept actual payment notifications, verify commercial transactions, or turn pending orders into paid orders. Webhook events have no ability to issue entitlements, alter order state, or produce receipts. The endpoint is deliberately named **test-webhooks**.

## Configuration

Set `DMA_SANDBOX_WEBHOOK_SECRET` in the server environment to a random string of at least 32 characters. The secret is server-only, never stored in the repository, Vite bundle, or GitHub Pages. Without it, the endpoint returns HTTP 503; invalid lengths fail application startup.

`POST /v1/test-webhooks/payments` expects exact JSON with only these fields:

```json
{"eventId":"evt_unique_test_1234","orderId":"<existing sandbox order UUID>","kind":"sandbox.payment_observed"}
```

`kind` may be `sandbox.payment_observed` or `sandbox.payment_failed`. These types are **observations, not authoritative payment statuses**.

Headers: `x-dma-timestamp` is the sender's Unix time in **milliseconds**; `x-dma-signature` is `sha256=<lowercase-hex-HMAC>`. Calculate HMAC-SHA256 using the secret, over **exact bytes** `timestamp + "." + raw-json-body` (UTF-8). The server validates in constant time against the raw request bytes and rejects timestamps more than five minutes in the past or future.

## Guarantees and limits

- Payloads larger than 16 KiB are rejected.
- Events must reference an existing sandbox order.
- A unique event ID is persisted once with the digest and timestamps (schema v7). Identical replay returns 200. Conflicting payloads with the same ID return 409.
- Authenticated admin-only `GET /v1/admin/test-webhooks` lists up to 100 sanitized event-metadata rows. No event payloads, signatures, or secrets are exposed.
- Accepted events are audited as `sandbox_webhook.received`.
- Existing orders remain `pending`, and **no entitlements are issued** based on webhook receipts.

## Production gates

To support an actual provider, implement its **official signature algorithm and metadata contract**, event ingestion queue, durable idempotency and reconciliation state machine, raw-body capture, ledger and webhook lifecycle tests, retries/dead-letter handling, operational alerting, tenant isolation and explicit server-only payment-to-license approval. No browser/API call should ever mark a payment as settled without external verification.
