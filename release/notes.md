# DMA Hub v0.2.0-alpha.9

**Development alpha only — payments and production access are not enabled.**

## New
- SQLite v4 `catalog_products` migration preserving legacy users, sessions and profiles.
- Admin-only persistent product management: create draft items, list and update catalog records with version conflict protection.
- Public `GET /v1/catalog/live` returns published records only; archived and draft products are never exposed.
- Server-enforced role access controls and auditable product creation/updates.
- Endpoint tests for customer authorization denial, status transitions, duplicates and stale updates.
- README, API reference, catalog documentation and updated roadmap.

## Included from alpha.8
- Optional backend email verification and password recovery using expiring purpose-bound one-time token hashes and optional Resend delivery.
- Customer password reset / email verification flows and account session revocation.
- Tauri Windows launcher preview, local profile editor, read-only COM metadata discovery and GitHub Pages preview.

## Distribution
Web preview ZIP and checksum; unsigned Windows NSIS installer and checksum after Windows runner build validation.

## Important limitations
The customer-facing site still displays demo catalog records. The new `/v1/catalog/live` is the real persisted API, but prices, license entitlements, checkout, merchant CMS binding and real payment processing have not been implemented. An operator must provision an admin role offline; public self-promotion is prohibited.

Windows executables are **unsigned alpha**. The Node/SQLite service is **local development only** and must not be exposed publicly without verified email delivery, distributed throttling, TLS, operational security and recovery controls.
