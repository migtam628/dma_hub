# DMA Hub v0.2.0-alpha.11

**Test-only commerce prerelease — NOT a live payment or licensing service.**

## New in this release

- SQLite schema v6 adds owner-scoped sandbox order records, price snapshots, immutable idempotency keys and an explicit test-order state machine.
- Existing manual entitlements are preserved; sandbox-fulfilled grants now have distinct `source: sandbox_order` for auditing.
- Authenticated customer API: create an idempotent sandbox order and list only the signed-in customer's test orders.
- Admin-only API: inspect test order queue, explicitly fulfill or cancel pending orders with transactional state checks.
- Fulfillment grants **30-day test access**, only when product/account/plan are valid and no overlapping active grant exists. Replay is safe; no duplicate grants.
- Customer Billing screen exposes a clearly labeled sandbox order interface when signed into the local API.
- Admin Sandbox Orders screen has explicitly confirmed sandbox fulfill and cancel controls. Server role checks are mandatory.
- Test suite validates tenant isolation, idempotency, cancellation, access expiration, fulfillment replay, archived products, and legacy schema migration.
- README, roadmap, catalog API reference and sandbox order runbook updated.

## Existing foundation

Concept 3 web storefront preview, authenticated local API sessions, email verification/password recovery integration (optional provider), versioned profiles, USD plan definitions, test entitlements, Tauri Windows preview and read-only serial device discovery.

## Artifacts

- `dma-hub-web-v0.2.0-alpha.11.zip` and `SHA256SUMS.txt`.
- Unsigned Windows NSIS preview and `SHA256SUMS-windows.txt` ONLY after the Windows release build and download-back checksum verification pass.

## Critical limitations

**No money is collected.** Sandbox orders are not purchases or payment confirmations. There are no card inputs, provider checkout sessions, payment webhooks, real subscriptions, invoices, refund processing, cryptographic customer licenses, or commercial device activations.

The local API is not publicly deployed or production-secured. The GitHub Pages site remains a static preview; signed-in test workflows require the developer-controlled API. Windows installer remains **UNSIGNED**, intended for controlled testing.
