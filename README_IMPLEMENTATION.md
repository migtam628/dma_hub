# DMA Hub — current implementation status (October 29, 2026)

The canonical status and gates are in [README.md](README.md) and [docs/project-roadmap.md](docs/project-roadmap.md). This file replaces the obsolete milestone-1 summary.

## Implemented and tested in CI
- React/TypeScript/Vite Concept 3 static preview, GitHub Pages, releases and unsigned Tauri Windows alpha workflow.
- Local Node/SQLite account sessions, optional mail-backed verification/recovery, profiles, migrations, backups and restore drills.
- Admin-gated catalog and immutable USD plan amounts, test grants and idempotent sandbox orders.
- Stripe **TEST-only** Checkout Session creation and signed webhook observations, disabled without server credentials.
- Admin-only **read-only Stripe TEST provider session reconciliation** with strict amount, owner, order and mode matching. It never issues entitlements.
- Explicit Windows COM-port metadata enumeration; no device protocol writes or anti-cheat bypass.

## Not production ready
The public site is static/demo only. No live payment processing, settled-payment ledger, subscription/tax/refund workflows, signed Windows installer or commercial license activation. No API is approved for public hosting. Physical device QA, security assessment, and actual Stripe TEST account verification remain outstanding.

## Developer commands
Requires Node.js 22.16+ and npm:
```bash
npm install
npm run check
npm run dev
npm run dev:api
```
See [Stripe TEST guide](docs/stripe-test.md), [API](docs/api.md) and [roadmap](docs/project-roadmap.md).
