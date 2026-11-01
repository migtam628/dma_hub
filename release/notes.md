# DMA Hub v0.2.0-alpha.23

**Offline publisher-signed game artifact integrity verification. No trusted game-software publisher is yet enrolled and no game cheat downloads are enabled.**

## New in alpha.23

- Added an offline, read-only file verifier: `npm run verify:game-artifact -- --artifact <file> --manifest <signed-manifest.json> --signature <manifest.sig>`.
- Verifier independently streams the **actual local artifact bytes** through SHA-256, checks exact signed filename and file size, and validates a detached Ed25519 signature over the original manifest bytes.
- Publisher public keys are loaded from the repository-pinned `release/trusted-game-publishers.json` file, **initially empty**. Missing, revoked, invalid and unverified keys fail closed. No demo/test publisher identity is shipped as a trusted production key.
- The manifest must identify the fixed `migtam628/dma_hub` repository, a release tag, publisher ID, exact artifact filename, byte count and lowercase digest. Extra/unsupported fields are rejected.
- Added regression tests using ephemeral synthetic keys and artifacts: success, changed file bytes, altered manifest, false signature, revoked/no trust, wrong algorithm, mismatched filename/size and schema validation.
- Updated README, gaming architecture, API separation, roadmap, and detailed operator trust-bootstrap/verification instructions.

## Still not implemented

- No real publisher identity/key has been authenticated or registered. A success in synthetic tests is not evidence of any real software's provenance.
- No game cheat executables, game memory manipulation, device impersonation, anti-cheat evasion, hardware test certifications, production game integrations, commercial payments or license fulfillment.
- No automatic server-side binary verification, customer artifact downloads, or publication approvals. This CLI does **not** mutate the catalog API.
- GitHub Pages remains a static UI and the Windows installer remains an **unsigned alpha preview**.

## Distribution

The release workflow publishes a static web ZIP/checksum, and after Windows packaging verification adds an unsigned NSIS installer and Windows checksum. This game artifact verifier is included in the repository source and is **not** a certified publisher signing service.

See [offline artifact verification](docs/game-artifact-verification.md) and [gaming DMA roadmap](docs/games-dma-cheats.md).
