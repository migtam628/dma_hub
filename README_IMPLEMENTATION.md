# DMA Hub — implementation milestone 1
## What is working
- React + TypeScript + Vite / npm workspaces frontend
- Concept 3 visual tokens and shared UI package
- Responsive marketing homepage, product catalog, filters and product pages
- Customer overview, software library, profile, device and billing *preview* pages
- Admin preview with synthetic users, catalog, releases and systems views
- Launcher and device diagnostic web previews, clearly marked non-native
- Configuration Studio with browser-local persistence, JSON import/export and live preview
- Local interest list stored only in this browser
- React component, accessibility, typecheck and source-integrity checks in CI

## Not yet implemented
Account authentication, subscription payments, licensing, signed Windows apps, device adapters, production datastore, real API, deployment and production tests.

## Local development
Requires Node.js 22+. From repository root:
```bash
npm install
npm run dev
npm run check
```
Open the URL printed by Vite (normally http://localhost:5173). Hash routes permit static-host deployment.

## Security and scope
Hardware control is limited to a future documented, user-authorized integration; no protected game-memory access, anti-cheat circumvention or covert device behavior is included. Every simulated record is labeled demo-only. No payment or account claims are made.

## Next milestone
Introduce authenticated API service and schema migrations (pending product/security scope), actual releases/storage workflow and Windows Tauri shell.
