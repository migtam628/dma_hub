# DMA Hub v0.2.0-alpha.20

**Gaming DMA Cheats catalog foundation. Web-first planning UI; no working game-cheat engines or licensed software are included.**

## New in alpha.20

- New **DMA Cheats** storefront route `#/games` and per-game pages `#/games/:gameId`; linked from the main navigation and homepage.
- Ten clearly marked *planning* game categories. The category tiles do not claim supported cheats or downloads.
- Published-only API product listings filtered by game associations, with honest empty/unavailable handling on the static website.
- SQLite v13 additive `game_ids_json` migration preserving existing products with empty associations.
- Server-side game ID allowlist, de-duplication, software-only restriction, admin authorization, and optimistic version checks.
- Admin Products editor now supports game-to-product links. Older clients cannot silently erase the associations.
- Updated README, roadmap, and gaming product architecture; regression tests for migration, validation, privacy and version conflicts.

## Existing foundation

Prior alphas include the Concept 3 storefront and dashboard, local SQLite catalog, customer account API, manual test entitlements, commerce review cases, and an unsigned Tauri Windows companion.

## Artifacts

The release workflow publishes a static preview ZIP and checksum. Unsigned Windows NSIS preview and Windows checksum are added only after independent packaging verification.

## Production limitations

- **No functional DMA cheat binaries, game-memory access or verified compatibility** were built in this milestone.
- No hosted production API, secure release/licensing system, real paid fulfillment or commercial subscription is available.
- The product does not promise anti-cheat evasion, undetectability, ban immunity or legitimate compatibility without evidence.
- Games and product categories do not imply publisher affiliations.

See [DMA Cheats for Games architecture](docs/games-dma-cheats.md).
