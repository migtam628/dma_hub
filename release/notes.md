# DMA Hub v0.2.0-alpha.13

**Development prerelease: no live checkout, payment settlement or commercial licensing.**

## Added
- Schema v7 `sandbox_webhook_events` with authenticated event metadata, SHA-256 body digests and per-event uniqueness.
- Opt-in HMAC-SHA256 sandbox endpoint (`POST /v1/test-webhooks/payments`) that checks a server-only secret, the exact raw body and a five-minute timestamp window.
- Deduplicated successful replay handling and conflict rejection for reused event IDs with different payloads.
- Bounded 16 KiB payloads, strict event shapes and valid sandbox-order reference checks; no secret, signatures or raw payloads persisted.
- Admin-only read-only `GET /v1/admin/test-webhooks` and received-event list in Admin → Sandbox Orders.
- Tests cover tampering, replay, expiry, misconfiguration, oversized events, cross-role access and confirmation that a signed event **does not** alter order status or grant access.
- Updated README, API reference, documentation and roadmap.

## Existing alpha features
- Concept 3 web preview and customer/admin demo interfaces.
- Local API accounts, optional email verification and recovery, profile storage and transactional SQLite migrations.
- Admin-managed product and price records, manually granted test entitlements, customer sandbox orders and explicit admin test fulfillment.
- Tauri Windows unsigned installer, read-only local serial port metadata, release checksums and GitHub Pages deployment.

## Release artifacts
- Static web ZIP and SHA256SUMS.txt.
- Unsigned Windows NSIS installer and SHA256SUMS-windows.txt, uploaded only if the Windows job and checksum verification pass.

## Important limitations
`DMA_SANDBOX_WEBHOOK_SECRET` is not a payment-provider credential. No real Stripe, PayPal, or other merchant integration is enabled. Webhook observations are inert: they cannot settle purchases, issue entitlements, renew subscriptions or activate Windows software. The local API is not approved for internet exposure.

Signed Windows releases, official payment-provider webhooks, idempotent transaction reconciliation, device activation, production monitoring and encryption policies remain outstanding.
