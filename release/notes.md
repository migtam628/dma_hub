# DMA Hub v0.2.0-alpha.7

**Development alpha — do not use as a publicly exposed production authentication service.**

## New in alpha.7

- Transactional SQLite schema migrations (tracked to v2), supporting upgrades from the original user/session/profile schema and safe refusal of unsupported database versions.
- A verified manual SQLite backup command using the online backup API with non-overwriting, private snapshots, integrity checking and restore-drill tests.
- Disabled-account checks on login and existing sessions.
- Authenticated password changes requiring the existing password, with session-wide revocation and an audit trail.
- Customer Account settings to change a password and sign in again.
- Updated README, API documentation, database-recovery instructions, and implementation roadmap.

## Existing alpha functionality

- Concept 3 React storefront and cloud-profile UI, live GitHub Release Center, static Pages deployment at https://dma.moobee.lol/.
- Unsigned Tauri Windows launcher, manually triggered read-only COM/USB-to-serial port metadata discovery.
- Local-only Node/SQLite account API, versioned user profiles and Docker test deployment.

## Assets

- `dma-hub-web-v0.2.0-alpha.7.zip`, `SHA256SUMS.txt`, GitHub source archives.
- Windows NSIS installer and Windows checksum only after Windows CI and published-download checksum verification succeed.

## Still missing

Email ownership verification, out-of-band account recovery, distributed rate limits, encrypted off-site backup automation, secure public API hosting, commercial billing/licensing, signed Windows installers and updater, and physical device integration QA.

**The Windows installer remains unsigned and should be used only in a controlled test environment.** The Pages frontend does not host the API.
