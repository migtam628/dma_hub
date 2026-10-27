# DMA Hub v0.2.0-alpha.3

**Development prerelease — not production software.**

## Included
- React Concept 3 storefront, customer and admin workspace previews.
- Public Downloads and Release Center that read **actual releases and assets** from the official GitHub Releases API, with fallback if the API is unavailable.
- Custom-domain GitHub Pages workflow deployed at https://dma.moobee.lol/ with HTTPS.
- Tauri-based Windows launcher preview packaged as an **unsigned NSIS installer**.
- Browser-local Configuration Studio, JSON import/export, live previews, and account-specific profiles when running the local development API.
- Dockerized local API, CI/build validation, API unit tests, versioned web ZIP, installer and checksums.

## Download assets
- `dma-hub-web-v0.2.0-alpha.3.zip`: static website bundle.
- `SHA256SUMS.txt`: SHA-256 checksum of the web bundle.
- `DMA.Hub_0.2.0_x64-setup.exe`: unsigned Windows launcher preview, uploaded only if the Windows build succeeds.
- `SHA256SUMS-windows.txt`: checksum of the Windows installer, uploaded only if it is built and uploaded successfully.

## Limitations
- The Windows installer is **unsigned** and has no automatic signed-update system.
- Account registration and profile API are local-development only and are not deployed on GitHub Pages.
- Real hardware/device adapters, payment services, commercial subscriptions and production license enforcement are **not implemented**.
- The public site uses sample account/device data; do not interpret demo values as live device status.
