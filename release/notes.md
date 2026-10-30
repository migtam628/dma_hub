# DMA Hub v0.2.0-alpha.19

**Catalog metadata development alpha. API remains local-only, payments remain non-production/test-only, and the Windows installer is unsigned.**

## New in alpha.19

- SQLite schema v11 additive migration for `category`, `features_json`, and `requirements_json` with safe defaults for legacy products.
- Strict admin-side and server-side catalog metadata validation: defined category values, up to 10 unique entries per list, 1–140 characters per entry and control-character rejection.
- Version-checked admin create/update workflows that retain metadata when older PATCH clients omit new fields.
- Published-only catalog API returns documented features and requirements without exposing drafts, archives or admin-only fields.
- Public product catalog supports search and category filtering; product detail pages show the declared feature and requirement lists with verification caveats.
- Added schema migration and API regression tests, updated README, API/catalog references and roadmap.

## Existing foundation

The v0.2.0-alpha.18 release added database-backed Admin Products editing and read-only public product detail routes. Earlier alpha releases include Concept 3 web/desktop UI, local account sessions, profiles, manual test grants, Stripe TEST Checkout observation-only flows, admin audit/security monitoring, GitHub Pages and unsigned Windows NSIS packaging.

## Distribution

Static web preview ZIP, SHA-256 manifest and verified **unsigned** Windows NSIS preview when Windows packaging finishes. Downloads are development-only and should be verified against published checksums.

## Production gates not completed

No public production API, signed Windows binaries, commercial payments or licenses, independently verified software or hardware compatibility, verified hosted email delivery, independent security review, cross-host rate limiting, reliable device adapters, or approved production fulfillment.

**Do not publicly expose the local SQLite API or interpret the published catalog metadata as compatibility certification.**
