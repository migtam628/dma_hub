# DMA Hub v0.2.0-alpha.5

**Unsigned development alpha; not intended for commercial or production use.**

## Features included
- Public Concept 3 storefront, customer/admin demos and live GitHub Release Center at https://dma.moobee.lol/.
- Tauri Windows launcher and **explicit read-only serial/USB-to-serial port enumeration**, showing Windows COM port metadata only after the user clicks Scan.
- Browser-local settings and JSON import/export; local API profiles with tenant isolation and conflict detection.
- API security improvements: account session inventory, revoke-all, five-session cap, bounded registration/login attempts and request body size handling.
- Windows artifact verification corrected to accept Tauri's installer filename containing a space.
- GitHub Actions PowerShell syntax validation, version checks, installer checks and published checksum validation.

## Release assets
- `dma-hub-web-v0.2.0-alpha.5.zip` plus `SHA256SUMS.txt`: web preview bundle.
- Windows NSIS installer and `SHA256SUMS-windows.txt` **only when the Windows build and integrity checks complete successfully**.
- GitHub source archives.

## Release history note
Alpha.4 shipped the web bundle but its Windows job failed due to a packaging-verifier script defect. Alpha.5 corrects this failure; use the alpha.5 installer once it is successfully published.

## Limitations
The installer remains **unsigned**, there is no trusted auto-updater, native device scanning has not yet been manually validated on a physical Windows system, and the development API is not configured for public hosting. Live billing, licensing and device-specific control are not present.
