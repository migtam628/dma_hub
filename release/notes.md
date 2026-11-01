# DMA Hub v0.2.0-alpha.24

**Publisher trust fingerprint hardening and safer offline artifact verification. No real publisher key has been authenticated or added.**

## New in alpha.24

- Publisher trust registry updated to **schema v2**, requiring a lowercase SHA-256 fingerprint of each Ed25519 public key's canonical SPKI DER bytes. Fingerprint mismatches, duplicate public-key fingerprints, wrong algorithms, private key material, unexpected registry fields and unknown status values are rejected.
- Added **read-only publisher public-key inspection**: `npm run inspect:publisher-key -- --key <public-key.pem>`. It displays the canonical SPKI fingerprint and explicitly does **not** authenticate a real publisher or modify trusted keys.
- Hardened `npm run verify:game-artifact` to hash file bytes from an already-opened regular file handle, with no-follow protection on supporting operating systems and file identity/size/time consistency checks before and after reading.
- Manifest, signature and trust-registry inputs use the same bounded file-handle reading approach.
- Successful CLI verification now returns the matched publisher's trusted-key fingerprint for independent operator review.
- Expanded tests for signature/byte tampering, fingerprint swap, duplicate anchors, revoked/missing trust, private keys, unsupported algorithms, symlinks and unexpected metadata.
- Updated README, publisher onboarding guide, game architecture and roadmap.

## Security and production boundaries

The checked-in `release/trusted-game-publishers.json` registry is **empty**. No legitimate game-software publisher is yet authenticated, and inspection of a key alone does not establish identity. Out-of-band verification and reviewed changes remain mandatory before any publisher becomes trusted.

The local verifier demonstrates cryptographic consistency for a point-in-time artifact snapshot only. It is **not** malware scanning, Windows code-signing verification, game compatibility testing, anti-cheat compliance, source authenticity independently of key onboarding, software execution authorization or a license service.

No functional DMA game cheat modules, hardware memory operations, anti-cheat bypasses, download/activation flows or real payment processing were added. GitHub Pages remains a static frontend.

## Download artifacts

The release workflow publishes a web ZIP and SHA-256 checksum; the separate Windows job publishes an **unsigned** NSIS preview and its checksum only after successful build verification. The publisher inspection and artifact verifier commands run from the repository source and do not require unsigned installer execution.

See [publisher trust verification guide](docs/game-artifact-verification.md) and [DMA Cheats roadmap](docs/games-dma-cheats.md).
