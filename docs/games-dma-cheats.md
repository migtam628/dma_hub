# DMA Hub — DMA Cheats for Games (catalog foundation)

**Project direction:** DMA Hub includes a game-first DMA software discovery and management division alongside the existing hardware, generic software, Windows launcher, and admin workspaces.

## First implemented milestone

- Public route `#/games` lists **planning categories** for ten game titles, with search and dedicated `#/games/:gameId` pages.
- The game pages display only catalog records actually returned by the **local published-only API**, filtering by administrator-assigned `gameIds`. With no backend or published products, they present an accurate empty/unavailable state instead of made-up downloads.
- The admin Product Management form allows game association selection for **software** records (not hardware or cloud entries), with server-side authorization and optimistic version checks.
- SQLite migration **v13** adds `game_ids_json` with `[]` default for existing products. No existing item is silently reclassified as a game cheat.
- The backend validates a bounded list of distinct, recognized IDs and preserves associations when older PATCH clients omit `gameIds`.
- `GET /v1/catalog/live` and `GET /v1/catalog/live/:slug` include game associations only for published records. Draft/archived records remain private.
- Standard Products and Hardware routes remain unchanged, and the static GitHub Pages deployment continues to be **front-end-only**.

## Supported planning categories (not functional claims)

Counter-Strike 2, Fortnite, Rust, Apex Legends, Call of Duty / Warzone, Valorant, Escape from Tarkov, Rainbow Six Siege, PUBG, and ARC Raiders.

These are *placeholders for game discovery*, not product endorsements, licenses, tested compatibility, working DMA adapters, or indications that an anti-cheat can be bypassed. Game names and marks belong to their respective owners; no affiliation is implied.

## Game DMA product model

A product must be associated with a game, but the game alone does not establish device or software support. Before any product is described as ready, the operator must separately verify:

1. Game edition/build and version range, supported OS and hardware models.
2. Product publisher/source ownership, documented software behavior, safety and legality of use.
3. Tested installation and configuration workflow in an authorized environment.
4. Versioned, cryptographically verified download artifacts with release and rollback policy.
5. Subscriptions, payment reconciliation, signed license fulfillment, refunds, revocation, privacy and support rules.

The project will not claim a product is undetectable, ban-proof or compatible without verification. The current catalog does **not** run or distribute cheat binaries, perform external game memory access, disguise DMA hardware, interact with an anti-cheat, or implement aiming automation.

## Next milestones

1. Create a dedicated admin game/software matrix (game editions, compatibility QA outcomes, status dates, hardware matrix, release assets and review workflow).
2. Link reviewed catalog records to checksum-verified GitHub Releases without publishing credentials or private license keys.
3. Connect the Windows companion to an authenticated, authorized launcher/manager with safe configuration and update reporting.
4. Deploy the API behind appropriate identity, TLS, backups, abuse controls and audit operations.
5. Validate business/commercial integrations before enabling checkout, license issuance or subscriptions.

No actual gaming-cheat functionality is included in the first milestone. The scope is honest product discovery and infrastructure for a potential product offering.

## Game compatibility QA — schema v14 (development milestone)

Versioned operator attestations now use an append-only review history:
- `GET /v1/games/:gameId/compatibility` lists only **operator-reviewed** records for currently published software, exact matching game association and unchanged product version. Drafts, withdrawn reviews, archived products and stale reviews never appear.
- `GET /v1/admin/game-compatibility` shows the admin review queue with build, OS, hardware, evidence reference, status, and stale-version indicators.
- `POST /v1/admin/game-compatibility` creates a **private draft** (game, product, exact game build, Windows OS, hardware and optional HTTPS evidence reference).
- `PATCH /v1/admin/game-compatibility/:id` requires `If-Match` and accepts deliberate state transitions: `draft → reviewed / withdrawn`, `reviewed → draft / withdrawn`, `withdrawn → draft`.
- To attest **reviewed**, the product must remain published software with a matching game association, a current product version and non-empty HTTPS evidence reference. Resetting to draft adopts the product's current version for a new review cycle.
- The public API exposes only an **evidence-on-file boolean** and a review timestamp; the private evidence reference and staff identities are not returned.
- Changes are audit-recorded, review event history is append-only and database triggers block event modification/deletion. The admin UI is under **Admin → Game QA** on an authenticated local API.

**Important:** `operator_reviewed` means a human administrator attested evidence. It is neither independent verification nor proof that a game, DMA device, operating system, or a publisher's rules allow the software. No cheat functionality, download delivery, device firmware changes, evasion, or customer licensing is enabled here.
