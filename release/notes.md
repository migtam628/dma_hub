# DMA Hub v0.2.0-alpha.21

**Game compatibility QA alpha. Operator-reviewed, version-scoped compatibility attestations; not independent certification and not functioning game cheats.**

## New in alpha.21

- SQLite schema v14 additive compatibility-review tables with immutable event history and audit trail, preserving existing products and game associations.
- Local API admin-only workflow for game build, OS, hardware and evidence-reference recording, controlled draft/review/withdraw transitions and optimistic version checks.
- Review approval requires currently published software, matching game association, current product version and an internal HTTPS evidence reference.
- Public per-game pages now **fail closed**: show software as operator-reviewed only with a matching current review; no draft, withdrawn, archived or stale records. Reviews go stale automatically when the product changes.
- Private internal evidence links, internal reviewer IDs and review history are never exposed through the public compatibility endpoint.
- New **Admin → Game QA** workspace with draft creation, queue, attestation/withdrawal controls, and validation/error messages.
- Regression tests for v13→v14 migration, permissions, visibility, immutable events, stale invalidation and revocation. Updated README, API, roadmap, and gaming documentation.

## Distribution

Static web preview ZIP, checksums, and unsigned Windows NSIS alpha preview after successful packaging verification.

## Important boundaries

The `operator_reviewed` label records an administrator attestation only; it does **not** independently verify compatibility or guarantee any hardware/game/anti-cheat outcome. DMA Hub still provides no working cheat executables, game-memory integration, device impersonation, real commercial payments, production license fulfillment, or signed Windows installer. The GitHub Pages site is static with no hosted API; all local API claims are conditional on a separately configured development backend.

See [Game DMA catalog and compatibility QA](docs/games-dma-cheats.md).
