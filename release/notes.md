# DMA Hub v0.2.0-alpha.14

**Experimental development alpha only. Live payments and commercial licenses remain disabled.**

## New in alpha.14

- Stripe TEST-mode Checkout Sessions: opt-in provider test adapter accepts only `sk_test_` credentials, verified endpoint secret and trusted server-side return URLs.
- Authenticated users may prepare test Checkout for their own **pending, one-time sandbox orders**; price, currency and product metadata come from the API database, not the browser.
- Provider calls use one idempotency key per sandbox order and strictly validate the returned test session, amount, metadata and Stripe-hosted URL.
- Official Stripe `Stripe-Signature` v1 HMAC verification with raw request bytes and a five-minute timestamp window. Test-only webhook event IDs and content hashes deduplicate deliveries in SQLite schema v8.
- Recorded `test_paid_observed` is an **observation only**: no sandbox order fulfillment or entitlement issuance is permitted by the webhook path.
- Customer Billing test-order interface can create or show Stripe test Checkout links when a local API operator enables it. The admin Sandbox Orders interface exposes sanitized Stripe test-session/event metadata.
- Tests for access isolation, unsupported recurring plans, live-key refusal, provider response mismatches, signature tampering, expired/replayed event delivery and non-fulfillment.
- README, database migrations, backup checks, API reference, Stripe integration guide and roadmap updated.

## Included from previous alphas

Concept 3 frontend, demo storefront, local user/profile APIs, optional email verification, admin product pricing, sandbox manual grants, auditable test orders, read-only audit log and Tauri Windows preview.

## Artifacts

Web ZIP with SHA-256 manifest; unsigned Windows NSIS installer and Windows SHA-256 manifest if the Windows release job passes.

## Limitations / approval gates

This release does not ship Stripe credentials, make real Stripe API requests on its own, support recurring billing, reconcile authoritative payment status or issue a license based on test payment observations. **Actual Stripe test-mode transactions have not been performed.**

Production public API security, payment ledger, subscriptions, refunds/taxes, Stripe account verification, independent reconciliation, Windows publisher signing, secure updater, device QA and production authorization are still outstanding.

**The Windows build is unsigned and is intended for controlled testing only.**
