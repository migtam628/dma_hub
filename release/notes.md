# DMA Hub v0.2.0-alpha.12

**Experimental alpha: local API features and unsigned Windows preview only.**

## Changes since alpha.11
- My Software customer library now correctly distinguishes `admin_test_grant` from `sandbox_order` entitlements, including human-readable product and plan names.
- Added an admin-only read-only Audit Log with bounded pagination and explicit forbidden/error states.
- Audit API exposes action metadata, actor/target IDs and timestamps; it excludes user passwords and session credentials.
- Added API tests for role restrictions, pagination validation and event disclosure protections.
- Preserved the previous alpha's sandbox order creation, price snapshots, safe retries, admin fulfillment/cancellation, 30-day test grants and entitlement expiry.
- README, backend API reference, operational audit documentation and roadmap updated.

## Distribution
- Static web preview and SHA-256 checksum, published on GitHub Releases and GitHub Pages.
- Unsigned Windows NSIS installer and checksum, attached only if the Windows release job and asset verification complete.

## Still not available
No public backend deployment, verified commercial identity provider, real merchant checkout, credit-card processing, payment/webhook validation, subscriptions, receipts, signed software licenses, secure auto-updates or production hardware control.

**All orders and entitlements in these workflows are sandbox development records.** Never construe them as evidence of payment or product purchase.
