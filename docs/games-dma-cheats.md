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

## Game release provenance — schema v15

This milestone adds metadata-only records bound to one operator-reviewed game/build. It does **not** provide executable distribution, authorization, signed licenses, or downloads.

- Admin → **Game Assets** registers the reviewed game compatibility record, fixed-repository GitHub tag, exact asset filename, and an expected 64-character SHA-256 checksum.
- The repository is **fixed** to `migtam628/dma_hub`. No user-provided URLs are fetched. The server reads GitHub's public Releases API over HTTPS and compares the asset's `digest` (format `sha256:...`) with the operator-supplied expected hash. It also checks exact filename, positive asset ID and size, and uploaded state. Missing or contradictory metadata fails closed.
- State transitions are `draft → metadata_matched → withdrawn` (or `draft → withdrawn`). Every transition requires an admin session and `If-Match` version; events are immutable and audit-recorded.
- When an associated compatibility review or product version changes, the older metadata record is **stale** and hidden from the public game page. Archived products and withdrawn reviews are similarly hidden.
- The public `GET /v1/games/:gameId/release-records` returns matching metadata and *never returns* a download URL. It states `metadataOnly=true`, `noDownloadLinks=true`, and `notBinaryVerified=true`. GitHub's asset digest is compared without downloading or hashing the asset's bytes; this is **not** independent binary verification, source-signature verification, malware screening, or publisher attestation.
- Private operator identities and QA evidence links do not appear in public records.

Before any production download can be enabled: independently hash the downloaded artifact, verify publisher ownership/signatures, check the build's approved QA matrix and current release provenance, design revocation/rollback and authentication, and independently review safety/legality. No cheat binaries or anti-cheat functionality are created by this milestone.

## Offline local artifact signature and byte verification — Alpha 23

The optional `npm run verify:game-artifact` CLI adds an **independent local-byte SHA-256 comparison** and Ed25519 detached manifest signature check against operator-pinned trusted public keys. Unlike the API's GitHub metadata digest comparison, this CLI hashes the actual artifact file on disk. It does not submit QA status to the API, publish downloads or execute software. The default publisher registry is empty: no real publisher trust is claimed. More details: [signed local artifact verification](game-artifact-verification.md).

## Alpha 24 trust onboarding safeguards

Offline `npm run inspect:publisher-key -- --key <public.pem>` prints an Ed25519 SPKI SHA-256 fingerprint without importing the key. Publisher trust registry v2 requires the fingerprint to match the pinned key bytes; missing/revoked keys, duplicates, key replacement and private keys fail closed. This does not authenticate the publisher: human out-of-band verification and reviewed onboarding are required. The local file verifier now hashes an already-opened file descriptor and checks file metadata stability, but no software distribution or anti-cheat functionality is enabled. See [verification guide](game-artifact-verification.md).

## Manual game and hardware QA evidence journal — schema v16

The local API now includes an **append-only operator-reported QA journal** linked to an exact, currently reviewed product, game build and Windows platform. No software is automatically executed, installed, modified or certified.

- Admin → **QA Lab** records a test scope (hardware setup, installation validation or functional smoke), an outcome (passed, failed or retest required), Windows build, hardware/firmware revision, optional private HTTPS evidence link, operator notes and an explicit authorization attestation.
- Passing or failing observations require evidence and meaningful notes. A reported pass additionally requires confirmation that the relevant owner/publisher authorized the test; this is operator self-attestation, **not independent rights verification**.
- Every observation is append-only, actor-audited and linked to the product and compatibility-review versions at the time of recording. Old observations become stale if the product or review changes, is withdrawn or archived. A later failure or retest-required outcome for the same scope supersedes an earlier pass.
- `GET /v1/games/:gameId/qa-status` returns only the **latest currently valid operator-reported result per review and test scope**, without staff identities, private evidence URLs or internal notes. All responses explicitly declare `independentlyCertified:false` and `downloadEnabled:false`. No assessment is fabricated for untested products.
- `GET /v1/admin/game-qa-results` and `POST /v1/admin/game-qa-results` require an authenticated administrator. POST additionally requires an `If-Match` header equal to the current compatibility-review version. SQLite schema v16 creates `game_qa_results` with triggers preventing UPDATE/DELETE.
- After any game patch/build change the operator should record **retest required** and update the corresponding exact game-build review. No automated game patch detection is yet implemented.

This is a **manual test evidence and status mechanism**, not a test runner, source provenance guarantee, permission to cheat, independent validation or compatibility certification. The storefront still provides **no executable software downloads**.

## Buyer readiness and setup planner — Alpha 26

The public `#/setup` route provides a real client-side hardware inventory wizard, not a game cheat, device diagnostic or executable setup. It covers environment identification (game planning category, self-reported build, Windows PCs, hardware model), six manual readiness checks and a summary that distinguishes inventory status from real compatibility. Plans are held only in local browser storage and can be exported as JSON/text/PDF, copied, or reset. There are no network requests for the planner, no runtime device access or commercial entitlement changes. Even complete inventory cannot establish game support or authorized software access.

Research and reference decisions are documented in [competitive-reference-research.md](competitive-reference-research.md).

## First scoped game pilot: Call of Duty: Warzone PC — Alpha 29

The user selected Call of Duty as the first pilot. `#/games/call-of-duty/pilot` now offers a non-executable PC readiness worksheet with official Activision requirements, an upcoming patch/build recheck window, strict local input validation and portable QA handoff exports. The Warzone edition is an initial scope choice, **not** a user-verified game build. No game-specific cheat software has been tested or approved. See [Call of Duty pilot research and testing gates](call-of-duty-warzone-pilot.md).

The same November 6 recheck gate is enforced **server-side** on public Call of Duty compatibility, operator QA and metadata-only release records, not just in the browser worksheet. Pre-update reviewed records disappear after the announced date until manually reviewed again; current reviews still do not authorize execution/downloads.

## Multi-title Xbox/PC platform expansion — Alpha 30

The user plans to test several modern Call of Duty editions and asked whether Xbox can use DMA Hub services. A new [official-source Xbox and PC availability matrix](call-of-duty-xbox-pc-matrix.md) documents Warzone, Modern Warfare II–IV and Black Ops 6–7 with a Series X|S / Xbox One choice and separate web-vs-native capability status. Xbox One Warzone sunset and MW4 Xbox One exclusion are explicitly flagged. No native Xbox software, direct game-memory features, unapproved input manipulation, automated console diagnostics or Xbox compatibility certification is implemented.
