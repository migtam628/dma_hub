# DMA Hub v0.2.0-alpha.17

**Security-operations development alpha. API remains local-only, Stripe remains test-only, and Windows remains unsigned.**

## New in alpha.17

- Admin-only `GET /v1/admin/security` returns aggregate authentication throttle activity from the local SQLite database, never individual account, email, IP address, or hashed bucket identifiers.
- New **Admin → Security Monitoring** React dashboard shows active rate windows, rejected requests, blocked buckets, policy thresholds, and previous-24-hour successful authentication audit counts.
- Rate-limit enforcement and security reporting use one shared `RATE_LIMIT_POLICIES` definition, avoiding threshold drift.
- Privacy, RBAC, expiry, bucket-count, and threshold-consistency regression tests.
- Clear API signals `distributedAcrossHosts:false`, `productionSecurityApproved:false`; the dashboard makes no claim of attack attribution or public-internet readiness.
- README, API reference, rate-limiting guide, operations documentation, roadmap, and issue #2 updated.

## Existing foundation

React/Tailwind storefront/admin preview, Node/SQLite v10 accounts, verification/recovery support with optional mail provider, persisted local throttling, product catalog and test pricing, sandbox orders and manual test entitlements, optional Stripe TEST Checkout/reconciliation observations, Tauri Windows preview and static GitHub Pages site.

## Distribution

Web preview ZIP and SHA-256 manifest. An unsigned Windows NSIS preview and corresponding SHA-256 manifest are attached only after Windows build and asset verification complete.

## Incomplete production gates

No shared cross-host rate limiting, incident alerting/SIEM, tested live transactional email provider, security assessment, commercial billing, financial settlement reconciliation, paid license enforcement, publisher-signed installer, secure updater, or physical-device certification.

**Do not expose the local API to the public internet or interpret this monitoring dashboard as a production security control.**
