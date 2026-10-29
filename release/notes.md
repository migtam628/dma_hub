# DMA Hub v0.2.0-alpha.15

**Experimental alpha / TEST-mode observations only. No live commerce, payment settlements or commercial licenses.**

## New in alpha.15

- Schema v9 stores normalized status snapshots from administrator-initiated Stripe TEST Checkout Session lookups.
- Snapshots persist only after server-side provider response validation (matching session, owner, test mode, USD amount and related order).
- Unique checkout/state fingerprints ensure repeat checks are idempotent; changed status combinations create another inspectable history item.
- New authenticated admin-only endpoint: `GET /v1/admin/stripe-test-checkouts/:id/observations`, bounded to 50 items.
- Existing `POST .../:id/reconcile` returns test observation ID, replay status and first-seen timestamp. Provider errors and mismatches create no observation records.
- Admin → Sandbox Orders now offers **History** and **Check Stripe TEST** controls, plus a clear read-only observation list.
- Tests cover migration from v8, duplicate reads, state transitions, authorization, provider mismatches, outages, and zero unauthorized entitlement issuance.
- README, API documentation, Stripe reference, roadmap, and commerce issue updated.

## Included foundation

React/Tailwind storefront and administration previews, local user/profile API, product/plan data, test-only sandbox orders, manual grants, test Stripe Checkout/webhooks, and unsigned Windows Tauri launcher.

## Distribution

Web preview ZIP and SHA-256 checksum. Windows unsigned NSIS installer and matching checksum only after the release workflow builds and verifies the Windows artifact.

## Remaining

No actual Stripe account credentials are connected. Tests currently use mocked provider responses; real Stripe TEST-mode sandbox sessions and webhook delivery remain unverified. No financial ledger, payment settlement reconciliation, subscriptions, refunds/disputes, approved payment-based license issuance, production deployment, certificate-signed Windows installers, or secure updater is live.

**A Stripe TEST 'paid' state is not proof of settlement and does not grant access.**
