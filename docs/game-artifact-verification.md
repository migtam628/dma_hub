# Offline game software artifact verification — Alpha 24

**Purpose:** Verify artifact **bytes on disk** against the SHA-256 in an exactly signed manifest and confirm the manifest's detached **Ed25519 publisher signature** using a separately pinned, operator-trusted public key.

This workflow is intentionally offline. It does not download, install, inspect the behavior of, launch, activate, or license game software. It does not bypass anti-cheat systems or assert game compatibility.

## Trust bootstrap is deliberately incomplete

`release/trusted-game-publishers.json` ships with `"publishers":[]`. **No real publisher is currently trusted.** Successful production verification therefore requires an authorized operator to authenticate a publisher's public key independently (for example, through a verified publisher-controlled channel), inspect its fingerprint, and submit a reviewed repository change to pin it. Do **not** accept a public key provided alongside the software under test as proof of publisher identity.

The version-2 trusted registry requires an independently checked **SHA-256 fingerprint of the canonical Ed25519 SPKI DER public key** as well as the PEM. Inspect a candidate key *without adding it to trusted publishers*:

```bash
npm run inspect:publisher-key -- --key /path/to/publisher-public.pem
```

This prints a fingerprint and explicitly reports that no publisher identity has been authenticated and no registry change was made. Verify the fingerprint out of band with the actual software publisher through a trusted, separately verified communication channel. **Matching the fingerprint field to the PEM does not by itself prove the publisher owns the key.**

The trusted registry supports entries structured as:

```json
{
  "schemaVersion": 2,
  "publishers": [
    {
      "id": "verified-publisher-id",
      "status": "trusted",
      "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n<independently authenticated Ed25519 SPKI key>\n-----END PUBLIC KEY-----\n"
    }
  ]
}
```

This is **illustrative**, not a usable registry entry. Ed25519 signatures are checked against the complete original UTF-8 manifest file bytes, not reserialized JSON.

The operator can revoke a key with `"status":"revoked"`; revoked and missing keys fail closed. A real key rotation must be reviewed and coordinated with repository access controls, incident response and artifact revocation. **Never commit publisher private keys.**

## Signed manifest format

For a local file named `my-software.zip`, an independently authorized publisher produces a UTF-8 JSON manifest:

```json
{
  "schemaVersion": 1,
  "repository": "migtam628/dma_hub",
  "publisherId": "verified-publisher-id",
  "releaseTag": "v0.2.0-alpha.23",
  "assetName": "my-software.zip",
  "sizeBytes": 123456,
  "sha256": "REPLACE_WITH_EXACT_64_LOWERCASE_HEX_SHA256"
}
```

The last field is a placeholder; the manifest will be rejected until the real file's length and digest are supplied. The publisher signs the **exact manifest bytes** with its securely held Ed25519 private key. The detached signature file is one standard base64-encoded Ed25519 signature (64 bytes; canonical 88-character base64). The publisher must protect signing access and manage revocation.

## Verification

First obtain the artifact, manifest and detached signature from an approved source. Run:

```bash
npm run verify:game-artifact -- \
  --artifact /path/to/my-software.zip \
  --manifest /path/to/my-software.json \
  --signature /path/to/my-software.sig
```

The CLI reads pinned publisher keys from the repository; there is **no command-line trust-store override**. The result includes the matched publisher public-key fingerprint for operator review. A successful result means the local bytes match the signed manifest and the signature matches a locally trusted key. Missing keys, revoked keys, mismatched pinned fingerprints, duplicate key fingerprints, changed bytes, altered manifest, invalid signature, symlinks, mismatched filename and size all cause a nonzero exit code. It never follows downloads or executes a file. The local artifact is hashed from an already-opened regular file handle, with inode and before/after metadata consistency checks to reduce time-of-check/time-of-use risks. This is still a point-in-time check: preserve the verified bytes immutably before any later deployment.

This verifies cryptographic byte integrity and signature correspondence **only**. It does not validate provenance of the pinned key unless the operator authenticated it independently, nor inspect malware, Windows Authenticode status, game publisher terms, hardware compatibility, runtime behavior, anti-cheat compliance, commercial eligibility or licensing.

## Status and integration boundaries

- The current API `metadata_matched` means only **GitHub's asset metadata SHA-256** matched the operator's expected value. This offline verifier does not automatically change that API status.
- The offline CLI emits an integrity result to the local operator; it does **not** create a server-side `binary_verified` flag or publish download links.
- The public DMA Cheats website remains a static GitHub Pages frontend with no production backend.
- The verifier's automated tests use **ephemeral test-only** Ed25519 keys and synthetic file bytes. Test keys never become trusted production keys.

Future production gates: trusted publisher onboarding, independently controlled signing identity, independent malware and platform QA, repeatable artifact sourcing and release attestation, revocation/rollback, secured API hosting, and legal/commercial review before any real download or customer license service.
