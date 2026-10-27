# DMA Hub v0.2.0-alpha.4

**Experimental alpha release — not production-ready.**

## What's new
- **Windows Device Center:** explicit, read-only discovery of Windows COM and USB-to-serial ports. Users must click **Scan serial ports**; no ports are opened, read, configured or written.
- **Account workspace:** view current/other active sessions and revoke every session for a local API account.
- **Local API security:** maximum five sessions per account, session expiration cleanup, process-local registration/login throttling, predictable HTTP 413 on oversized JSON bodies and new automated tests.
- **Distribution verification:** source/release version consistency checks and Windows artifact integrity checks in GitHub Actions.
- Public storefront, customer workspace and admin previews with Concept 3 design; GitHub Pages at https://dma.moobee.lol/.

## Downloadable artifacts
- `dma-hub-web-v0.2.0-alpha.4.zip` and `SHA256SUMS.txt`: static web preview and checksum.
- Windows NSIS installer and `SHA256SUMS-windows.txt` are attached **only after** the Windows release build and integrity checks succeed.
- GitHub-generated source archives.

## Important limitations
- The Windows installer remains **unsigned**. Do not treat it as a trusted commercial distribution or a signed updater.
- Physical Windows hardware enumeration and compatibility must still be verified manually against Device Manager.
- The Node/SQLite API is local-development only. It is not publicly hosted; email verification, account recovery, distributed rate limiting and production operations remain outstanding.
- No billing, subscriptions, commercial license enforcement or device-specific control exists in this build.
