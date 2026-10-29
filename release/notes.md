# DMA Hub v0.2.0-alpha.16

**Development prerelease — API is not production-hosted, payments are test-only, and Windows packages are unsigned.**

## Authentication and API hardening

- Migrated from in-process authentication rate-limit maps to atomic SQLite fixed-window counters (schema v10).
- Added scoped SHA-256 key hashing; rate-limit storage does not contain plaintext IPs, email addresses, passwords, or session tokens.
- Limits now survive API restarts and can be shared across processes using one SQLite database file.
- Applied controls to registration, login, email verification requests, password recovery requests and password-change attempts.
- Added an additional 20-attempt/15-minute account-email login limit alongside existing IP limits.
- Configured bounded SQLite busy timeout for brief concurrent write contention and periodic expired-bucket cleanup.
- Tested rate-limit persistence, expiration, key isolation, backward migration and unchanged account/session behavior.
- Updated README, rate-limit documentation, email-auth docs, API reference, deployment guide and security issue.

## Existing alpha foundation

- Concept 3 storefront/admin UI previews, local accounts and profile API
- Test-only catalog pricing, manual entitlements, sandbox order fulfillment
- Optional Stripe TEST Checkout and read-only provider state observations
- Auditable SQLite schema migrations and manually verified backups
- Windows Tauri launcher and GitHub Pages release display

## Limitations

SQLite limits are **NOT** distributed across independent database copies or hosts, and cannot replace edge/WAF abuse mitigation or production monitoring. Email identity verification still requires a configured provider. Real Stripe test-account trials, independently verified settlement, commercial licenses, production security, encrypted off-host recovery, signed Windows updates and actual physical-device QA remain outstanding.

## Artifacts

- Web ZIP and SHA-256 checksum.
- Unsigned Windows NSIS installer and SHA-256 checksum after verified Windows build.
