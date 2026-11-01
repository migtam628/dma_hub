# DMA Hub v0.2.0-alpha.22

**Game software release provenance metadata alpha. No functional cheat binaries, binary verification, user downloads, or live licenses.**

## New in alpha.22

- Additive SQLite schema v15 introduces immutable, auditable game release asset records bound to exact operator-reviewed game/build compatibility records.
- Admin **Game Assets** workspace: draft registration of exact GitHub Release tag, asset filename and expected SHA-256; deliberate metadata-match and withdrawal actions.
- Server-side source is **pinned** to `migtam628/dma_hub`. It compares the expected hash with GitHub's uploaded release asset `digest`, and checks exact asset name, release tag, asset ID, uploaded state and positive size. Arbitrary operator URLs are never fetched.
- All state changes use admin-only authorization, optimistic version guards, append-only event history and audit records.
- Public `/v1/games/:gameId/release-records` and gaming product pages display only **current, matched metadata** when game review, product version and publication remain valid; withdrawn and stale records are hidden.
- Public metadata responses have **no download links** and explicitly deny executable approval. Matching GitHub's digest does *not* hash or validate downloaded binary bytes, publisher signatures, authenticity, malware absence or game compatibility.
- New regression tests, migration and backup verification, updated README, API specification and roadmap.

## Distribution

The release workflow publishes web alpha ZIP and SHA-256 manifest. An **unsigned** Windows NSIS preview and its checksum will appear only after the Windows packaging/verification job completes.

## Production blockers

No live hosted catalog API, signed/publisher-verified binary distribution, final game software builds, independent hardware/game compatibility tests, game integrations, production billing, license issuance, refund policies, or secure update rollout. Do not present planning games as compatible or metadata-matched records as download approvals.

See [DMA Cheats architecture and release metadata](docs/games-dma-cheats.md).
