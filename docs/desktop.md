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

[Windows Desktop Build](https://github.com/migtam628/dma_hub/actions/workflows/desktop.yml) compiles a Windows NSIS preview installer and attaches the file as a **workflow artifact** on successful runs. It does not yet publish an installer to GitHub Releases, until Windows build tests and signing policy are established. A native binary, if produced, is a user-facing prototype only.

## Security

The Tauri shell includes only `core:default` permissions and no device or remote commands. Native device operations require separate documented per-device adapters, explicit user permission and more restrictive Tauri capability definitions. Disable debug facilities for public distribution, add a strict webview CSP, verify installer publisher signing, and complete a security audit before general availability.

## GitHub Pages

The Pages deployment remains a separate static web preview. It does not include the Rust/Tauri binary.
