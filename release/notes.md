# DMA Hub v0.2.0-alpha.8

**Development alpha only — public account services are NOT deployed or approved.**

## Added
- Backend email verification and password recovery with purpose-scoped, SHA-256 hashed, expiring, single-use 256-bit tokens.
- Verification codes valid for 24 hours and recovery codes for one hour; used or replaced codes cannot be reused.
- Password recovery revokes all existing sessions and clears account codes, recording an audit event.
- Generic public request responses for known/unknown addresses, local request throttling and no token plaintext in database.
- Optional Resend HTTP email transport with server-only credentials; mandatory email verification fails closed if no mail transport is configured.
- Customer Account views for requesting email/recovery codes, verifying email, and changing forgotten passwords.
- SQLite v3 migration preserving existing data and new tests for v2→v3 upgrades, account enumeration and token expiry.
- Updated README, account-security docs, database recovery and roadmap.

## Previous alpha foundation
Responsive Concept 3 storefront and dashboards, cloud configuration profiles, Tauri Windows launcher, read-only serial metadata discovery, GitHub Pages and Release Center.

## Artifacts
Static web preview ZIP + SHA-256 checksum; unsigned Windows NSIS installer and its checksum are attached only after Windows CI succeeds.

## Important limitations
No verified production email sender has been configured in this repository. GitHub Pages cannot host the API. Distributed rate limiting, account abuse monitoring, email deliverability, independent security review, encrypted off-site backups, code signing, real commerce and licensing are unfinished.

Windows installer remains UNSIGNED, for testing only.
