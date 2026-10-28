# DMA Hub v0.2.0-alpha.10

**Development prerelease — not a production payment or licensing system.**

## New in alpha.10
- SQLite v5 migration for `pricing_plans` and `entitlements`, with constraints, foreign keys, indexes and backup verification.
- Admin-only plan management with safe USD integer-cent amounts, one-time/monthly/yearly metadata, unique plan codes and immutable price terms.
- Admin-only manual expiring **test** grants, audit trails, overlap prevention and idempotent revocation.
- Signed-in customer My Software page now retrieves user-scoped test entitlements from the local API rather than claiming demo licenses are real.
- New local-development admin Pricing & Test Access console for draft product creation, publication, plan setup, and manual test grant/revoke.
- Public pricing API returns only active plans of published products. A price record never grants access or performs a transaction.
- Tests verify admin authorization, user isolation, plan validation, stale version conflicts, grant expiry and revocation; existing accounts and profiles migrate forward.

## Included from previous alphas
- Concept 3 React storefront/portal previews and static GitHub Pages site.
- Email verification/password recovery code paths, opt-in mail provider and local API sessions.
- Tauri Windows launcher, read-only COM port discovery and signed-off CI build checks.

## Artifacts
- Web preview ZIP with SHA-256 checksum.
- **Unsigned** Windows NSIS preview installer and checksum, available only after Windows release build and download-back verification succeed.

## Still missing
No configured production mail sender, no live payment gateway, no purchase orders, no subscription billing, no entitlement generation based on payment, no signed license files, no native software activation, no production backend deployment or security approval. An admin must be provisioned offline; public registration cannot assign admin privileges.

**Do not interpret test entitlements as commercial licenses, paid subscriptions, or promises of product availability.**
