# DMA Hub — Engineering Roadmap and Reality Check

**Updated:** October 28, 2026  
**Project:** [migtam628/dma_hub](https://github.com/migtam628/dma_hub)  
**Approved UI:** Concept 3 — Professional Hybrid  
**Status:** Functional alpha with a public static preview and unsigned Windows installer. **Not production ready.**

## What actually exists

| Area | Evidence / current state | Next gate |
|---|---|---|
| Monorepo | `apps/web`, `apps/api`, `apps/desktop`, `packages/ui` and CI | Consistent contracts and integration testing |
| Storefront | React preview deployed to `https://dma.moobee.lol` | Real catalog, plans and checkout |
| Customer portal | Software/devices/account UI; synthetic state | Real authenticated account/entitlement data |
| Admin portal | Synthetic users, products, releases | Server-enforced roles and operational workflows |
| Configuration Studio | Local editor, JSON import/export, local API profile revisions | Validation, sync trust, applied-state receipts |
| API | Node.js/SQLite alpha with password accounts, sessions, tenant-scoped profiles | Mail-provider deployment and verification, distributed abuse protection |
| Data recovery | Versioned SQLite migrations and tested manual backup/restore tools | Encrypted off-host backups, restore drills and SLOs |
| Windows | Tauri NSIS unsigned preview, on-demand read-only COM metadata scan | Code signing, trusted updater, physical hardware tests |
| Releases | GitHub Actions, prerelease artifacts/checksums and automated checks | Signed Windows builds, release provenance and rollback |
| Hardware | Read-only serial-port discovery; no port opens or writes | Documented pilot adapter and physical compatibility QA |
| Billing/licenses | Not connected | Provider selection, webhook handling, auditable entitlements |
| Production hosting | GitHub Pages static frontend; local-only API/Docker | Dedicated secured API environment and observability |

### Repository layout (implemented)

```text
apps/
  web/                 React 19, TypeScript, Vite
  api/                 Node.js HTTP, SQLite, migration + maintenance tools
  desktop/             Tauri / Rust Windows app shell
packages/ui/           Shared visual components
.github/workflows/     CI, Pages, Windows, API Docker smoke, release
docs/                  Design batches, native device QA, API and recovery
release/               Version manifest and release notes
tests/                 Repository validation
```

## Phase gates and order

| Gate | Deliverable | Acceptance criteria |
|---|---|---|
| G0 — Completed | Concept 3 approved, design batches, web/desktop foundation and CI | Code and tests present, alpha release |
| G1 — In progress | Backend identity and recoverability | Transactional schema upgrades, verified backups, mail-backed email verification and recovery integration tests, hardened operational abuse controls and security review |
| G2 — Next | Catalog, pricing and entitlement domain | Real product records, role-safe APIs and auditable access events |
| G3 | Commerce | Payment provider, signed webhook handling, invoices/refunds, test/live isolation |
| G4 | Windows trust | Signed installers, signed update manifest, rollback and install/uninstall QA |
| G5 | Authorized device integration | One supported model, consent, read-only diagnostics and device test evidence |
| G6 | Operations | Admin RBAC, ticketing, incident controls, retention and audit reports |
| G7 | Beta and launch | End-to-end tests, accessibility, load/security tests, backups and restore, runbooks and business policies |

**No commercial purchase/activation claim before G2/G3 is complete.** Public site data that is still simulated must remain labeled.

## Approved principles

- Original software and user-authorized hardware integration; no unauthorized access to protected processes or anti-cheat evasion.
- Backend is the source of truth for accounts, licenses, entitlements and payments.
- Signed build provenance and revocation/rollback are prerequisites for production downloads.
- Separate static site hosting and secured API hosting.
- Sensitive local SQLite files, backups, and secrets stay out of Git and public artifacts.
- Every substantial change: code, tests, README, GitHub push, CI verification. Production release gates remain distinct from passing compilation.

## Open tracked issues

- [#2 Production account and API security](https://github.com/migtam628/dma_hub/issues/2)
- [#3 Signed Windows installer and updater](https://github.com/migtam628/dma_hub/issues/3)
- [#4 First documented hardware adapter](https://github.com/migtam628/dma_hub/issues/4)

[GitHub Pages activation issue #1](https://github.com/migtam628/dma_hub/issues/1) is resolved.

## Decisions still needed before commercial launch

Payment provider, business terms, first supported production software/hardware catalog, deployment/identity provider, publisher signing certificate, user privacy and retention policies. These do not block implementing local tests and safe scaffolding.
