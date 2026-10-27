# DMA Hub v0.2.0-alpha.6

**Unsigned preview release — not approved for production.**

## Included
- Responsive Concept 3 React storefront, public Downloads/Release Center, customer and admin previews.
- Tauri Windows launcher with explicit read-only local serial/USB-to-serial port enumeration.
- Local-development API accounts, versions of user profiles, session inventory and revoke-all; registration/login throttling and API tests.
- GitHub Pages custom domain at https://dma.moobee.lol/, Docker API smoke checks, and Windows native builds.
- Release pipeline fix: Windows installer file normalized to the published GitHub asset name `DMA.Hub_0.2.0_x64-setup.exe`, with a SHA-256 manifest entry using the same name.
- CI build verifies installer structure, version and signature status and downloads published assets to compare their hashes.

## Artifacts
- Static web preview ZIP and `SHA256SUMS.txt`.
- An **unsigned Windows NSIS installer** and `SHA256SUMS-windows.txt`, uploaded only if Windows release steps succeed.
- GitHub-provided source archives.

## Release history
Alpha.4 had an installer-check filename error. Alpha.5 uploaded its Windows installer but its final download-back verification failed because GitHub replaced spaces with periods in the published filename. This alpha resolves both errors.

## Limitations
Windows publisher code-signing, physical-device tests, secure updater, production backend security, real license issuance and payment processing remain unfinished. The public Pages site is frontend-only, and its demonstration account/device data is synthetic.
