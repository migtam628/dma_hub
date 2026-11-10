# Windows Desktop Preview — Tauri 2

This project provides a **desktop launcher shell only** at this milestone. It reuses the React Concept 3 web UI and opens directly at `#/launcher`, including UI-only Device Center and local Configuration Studio.

**Not included:** OS device discovery, protected process-memory reads, drivers, license activation, remote device APIs, Windows certificate signing or updater delivery.

## Local Windows setup

Install Node.js 22+, the supported Rust MSVC toolchain, Microsoft C++ build tools, Windows SDK and WebView2 runtime (see official Tauri prerequisites).

```powershell
npm install
npm run icons -w @dma-hub/desktop
npm run dev -w @dma-hub/desktop
```

Tauri launches the Vite dev URL and embeds the web interface in a native window. For packaging:

```powershell
npm run build -w @dma-hub/desktop
```

Expected unsigned NSIS output under `apps/desktop/src-tauri/target/release/bundle/nsis/`.

## GitHub build

[Windows Desktop Build](https://github.com/migtam628/dma_hub/actions/workflows/desktop.yml) compiles a Windows NSIS preview installer and attaches the file as a **workflow artifact** on successful runs. An unsigned Windows NSIS preview installer is published in alpha GitHub Releases after CI passes. This is **not** a signed or production-certified Windows installer. A native binary, if produced, is a user-facing prototype only.

## Installer integrity and QA

Before uploading a release, CI runs `node scripts/check-release-metadata.mjs` to align the release tag and Tauri/package versions. Windows build jobs check the generated NSIS file header, expected version, file size, and Authenticode status with `scripts/verify-windows-installer.ps1`. The release job uploads SHA-256 records, downloads the published installer and checksum back from GitHub, and compares the published and local hashes. This is **integrity checking, not code signing**.

Windows 10/11 interactive installation, launch, restart and uninstall tests still need hands-on validation. Use the [installer QA checklist](windows-installer-qa.md) and record evidence before promoting to a signed beta.

## Security

The Tauri shell includes only `core:default` permissions and no device or remote commands. Native device operations require separate documented per-device adapters, explicit user permission and more restrictive Tauri capability definitions. Disable debug facilities for public distribution, add a strict webview CSP, verify installer publisher signing, and complete a security audit before general availability.

## GitHub Pages

The Pages deployment remains a separate static web preview. It does not include the Rust/Tauri binary.

## Windows launcher ↔ local API bridge (PC beta foundation)

The Tauri app now directs requests to `http://127.0.0.1:8787` by default (only when running inside Tauri); normal browser deployments retain their previous API base logic. The packaged launcher offers live API health, in-memory account sessions, and authenticated cloud profile operations via the same React API client.

Run the API on the **same Windows PC** in a separate process:

```powershell
$env:HOST="127.0.0.1"
$env:PORT="8787"
$env:DESKTOP_ORIGIN="http://tauri.localhost"
npm run dev:api
```

Then start the desktop app and open **Launcher → Account** to register/sign in, **Launcher → Cloud Profiles** to create/retrieve/version a profile, and **Launcher → Overview** to recheck API health. The API accepts only the configured development-web and desktop origins, echoes only the matched allowed origin, and rejects other browser origins. The Tauri production origin should be checked on real Windows test machines; an origin mismatch must be corrected explicitly, not by allowing arbitrary origins.

**Not yet complete:** bundled API process lifecycle, Windows end-to-end physical testing, cross-restart token recovery, hosted backend, signing and updater. The app has no live payment or game-tool downloads. The local API stays loopback-only.

## PC beta API endpoint hardening (November 6, 2026)

Packaged Tauri clients always use `http://127.0.0.1:8787` even when `VITE_API_URL` is present during the web build. The environment override remains available to ordinary browser builds only. This prevents accidentally shipping a Windows preview pointed at a remote API. The local API is **not bundled or automatically started**; Windows install, sign-in, profile and restart recovery tests remain manual acceptance gates. Desktop-origin CORS preflight tests cover both the exact allowed origin and rejected origins.

## Loopback-only API bind guard (November 9, 2026)

The Node API refuses `HOST=0.0.0.0`, `HOST=::`, remote IPs and hostnames instead of accidentally exposing local accounts or test commerce endpoints. Use `HOST=127.0.0.1` for the current Tauri launcher. `::1` is also accepted for an explicitly IPv6-loopback local API, but the current desktop frontend targets IPv4 loopback. This does not install, start, or supervise the API service automatically.

Docker exception (November 10): `HOST=0.0.0.0` is accepted only when `DMA_CONTAINER_BIND=1` and `/.dockerenv` is present, for internal container networking. The supported Compose configuration publishes port 8787 on host `127.0.0.1` only. Publishing the container port on a public host interface is unsupported and unsafe; the internal bind exception is not a general production exposure approval. API container and private staging smoke checks must pass before merging.
