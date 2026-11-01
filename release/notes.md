# DMA Hub v0.2.0-alpha.25

**Manual game and hardware QA observations with fail/retest state precedence. No independent compatibility certification or functioning game cheat binaries.**

## New in alpha.25

- Additive SQLite schema **v16** adds immutable, operator-recorded game QA results linked to an exact, currently reviewed product/game build and product/review versions.
- New **Admin → QA Lab** workspace records hardware setup, installation validation or functional smoke-test observations as **passed**, **failed** or **retest required**, with Windows build, hardware/firmware revision, private evidence URL, notes, and an explicit permission declaration.
- Pass/fail require HTTPS evidence and meaningful notes; a reported pass also requires an administrator attestation that testing was authorized. This is *not independent validation* of rights or compatibility.
- Public game detail pages display only the **latest current operator-reported status** for each review and scope, clearly distinguish failure/retest from a prior reported pass, and never expose internal QA notes, reviewer identities or evidence URLs.
- A change to the associated game compatibility review or product version automatically makes older QA observations stale and removes them from the current public status response.
- New admin-only `GET/POST /v1/admin/game-qa-results` and public read-only `GET /v1/games/:gameId/qa-status`; observations are append-only with database write/delete prevention triggers and user audit.
- Expanded tests cover stale review/product invalidation, RBAC, evidence checks, fail/retest precedence and migration v15→v16. Updated README, API specification, game architecture and roadmap.

## Distribution

The release workflow publishes a static web ZIP and checksum; after verification, a separate Windows job publishes an **unsigned** NSIS installer and checksum.

## Still not implemented

No authentic game-cheat modules, memory access or anti-cheat bypass features, live hostable API, real publisher trust onboarding, independent game/hardware tests, downloadable game software, production billing, commercial entitlements, signing service, rollout or revocation automation.

A manually recorded `passed` result is **operator-reported only**; it does not certify game compatibility, publisher compliance, malware absence or legal permission. No QA results are seeded or fabricated.

See [DMA Cheats documentation](docs/games-dma-cheats.md).
