# DMA Hub v0.2.0-alpha.2

**Development prerelease; not ready for production.**

## Included
- Built React website preview, local settings editor, product and customer/admin demonstration interfaces.
- Node.js local API with scrypt-hashed account passwords, opaque sessions and versioned, tenant-scoped profiles.
- Tauri 2 Windows launcher shell using the approved Concept 3 interface.
- Windows NSIS installer produced from an automated Windows runner with build verification.
- Loopback-only Docker API test setup and smoke checks.
- Versioned release scripts and GitHub Pages workflow (repository-admin Pages enablement remains outstanding).

## Artifacts
- `dma-hub-web-v0.2.0-alpha.2.zip`: static React website bundle.
- `SHA256SUMS.txt`: checksum of website bundle.
- `DMA Hub_0.2.0_x64-setup.exe`: **unsigned Windows alpha preview** (appears only if the Windows release build succeeds).
- `SHA256SUMS-windows.txt`: installer SHA-256 checksum (appears alongside verified installer).
- GitHub source archives.

## Security / limitations
The Windows installer is **not publisher-signed** and should be treated as a test artifact. It does not implement drivers, device control, anti-cheat functionality, signed auto-update, production authentication, payment processing or license activation.

GitHub Pages remains a static frontend and cannot host the API. An administrator must enable Pages with GitHub Actions in repository settings before the public link is active.
