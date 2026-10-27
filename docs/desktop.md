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
