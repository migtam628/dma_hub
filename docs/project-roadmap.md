# DMA Hub — Engineering Roadmap and Reality Check

**Updated:** October 29, 2026  
**Project:** [migtam628/dma_hub](https://github.com/migtam628/dma_hub)  
**Approved UI:** Concept 3 — Professional Hybrid  
**Status:** Functional alpha with a public static preview and unsigned Windows installer. **Not production ready.**

## What actually exists

| Area | Evidence / current state | Next gate |
|---|---|---|
| Monorepo | `apps/web`, `apps/api`, `apps/desktop`, `packages/ui` and CI | Consistent contracts and integration testing |
| Storefront | Published-only local API catalog with category search, documented features and requirements; concept samples remain labeled | Hosted catalog API, verified compatibility/asset metadata, plans and checkout |
| Customer portal | Software/devices/account UI; synthetic state | Real authenticated account/entitlement data |
| Admin portal | API-backed admin editor with versioned metadata and explicit status transitions, Pricing & Test Access, audit/security views; other pages remain synthetic | Hosted admin controls, verified product metadata, real user and release operations |
| Configuration Studio | Local editor, JSON import/export, local API profile revisions | Validation, sync trust, applied-state receipts |
| API | Node.js/SQLite alpha with persisted auth limits, tenant-scoped profiles and read-only aggregate security monitoring | Mail-provider verification, cross-host abuse protection, TLS and independent security review |
| Data recovery | Versioned SQLite migrations and tested manual backup/restore tools | Encrypted off-host backups, restore drills and SLOs |
| Windows | Tauri NSIS unsigned preview, on-demand read-only COM metadata scan | Code signing, trusted updater, physical hardware tests |
| Releases | GitHub Actions, prerelease artifacts/checksums and automated checks | Signed Windows builds, release provenance and rollback |
| Hardware | Read-only serial-port discovery; no port opens or writes | Documented pilot adapter and physical compatibility QA |
| Pricing & test entitlements | Local API: immutable plan amounts, manual grants, idempotent sandbox order/fulfillment and owner-scoped access | Real hosted checkout, processor events and signed licensing |
| Billing/licenses | Stripe TEST Checkout, official webhook signature checks, read-only provider lookups and normalized test snapshot history | Actual provider account test, financial settlement verification, subscriptions/refunds and signed licensing |
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
| G1 — In progress | Backend identity and recoverability | SQLite v10 auth throttling and role-protected aggregate monitoring, plus migrations/backups and optional email recovery; distributed controls and security review outstanding |
| G2 — In progress | Catalog, pricing and entitlement domain | Public published-only catalog detail + admin editor, immutable price records and manual expiring test entitlements exist; hosted backend, signed licensing and activation pending |
| G3 — In progress | Commerce | Validated Stripe TEST provider reads, durable deduplicated **test observations**, and v12 admin/customer sandbox review cases now implemented; financial ledger, actual settlement reconciliation, refunds, subscriptions, and paid licensing remain unfinished |
| G4 | Windows trust | Signed installers, signed update manifest, rollback and install/uninstall QA |
| G5 | Authorized device integration | One supported model, consent, read-only diagnostics and device test evidence |
| G6 — In progress | Operations | Role-restricted read-only audit explorer exists; ticketing, incident controls, centralized retention and signed reports remain open |
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

- [#5 Catalog, pricing and commerce completion](https://github.com/migtam628/dma_hub/issues/5)\n- [#2 Production account and API security](https://github.com/migtam628/dma_hub/issues/2)
- [#3 Signed Windows installer and updater](https://github.com/migtam628/dma_hub/issues/3)
- [#4 First documented hardware adapter](https://github.com/migtam628/dma_hub/issues/4)

[GitHub Pages activation issue #1](https://github.com/migtam628/dma_hub/issues/1) is resolved.

## Decisions still needed before commercial launch

Payment provider, business terms, first supported production software/hardware catalog, deployment/identity provider, publisher signing certificate, user privacy and retention policies. These do not block implementing local tests and safe scaffolding.

### October 29 — Stripe TEST read-only provider verification

- Added an admin-only explicit Stripe TEST Session retrieval and strict account/order/amount/mode matching, plus audit record and regression tests.
- No test payment is treated as settled; no order state, entitlement, or license changes occur during lookup.
- Next: genuine provider TEST account QA, a provider-neutral durable reconciliation ledger with retries/refunds/disputes, and independent commercial approval before any paid fulfillment.

### October 29 — API product details and distinct admin editor

- Added public read-only product lookup restricted to published slugs and regression tests for draft/archived privacy.
- Replaced synthetic Admin Products page with role-gated local catalog editor including version checks and explicit status transitions.
- Connected published-product cards to real local API detail pages with unavailable/404 states, while keeping mock products clearly separate.
- Still no production API hosting, payments, licensing, signed downloads or device integration.

### October 30 — structured catalog metadata

- SQLite v11 additive catalog migration preserves existing entries with neutral `unspecified` category and empty feature/requirement lists.
- Strict bounded admin metadata validation, versioned edits, published-only API representation, and backward-compatible older PATCH clients.
- Public category/search filters and documented feature/requirement sections; these are unverified claims, not compatible-device certification.
- Next: verified product assets/release mapping, secure API hosting and operational review before any paid license flow.


### October 30 — provider-neutral sandbox commerce review workflow (schema v12)

- Added local SQLite review cases linked to sandbox orders, strict provider/reason allowlists, idempotent creation, and an administrator-only queue.
- Added optimistic versioned review transitions with append-only, database-trigger-protected event history and atomic audit records.
- Added sanitized, owner-scoped customer review status API; internal reasons and staff IDs are never returned to customers.
- Added migration/backup checks and regression tests for RBAC, tenant isolation, retries, state conflicts, immutability, and **zero entitlement issuance**.
- **Still blocked:** real provider TEST account evidence, financial settlement ledger, charge/refund/dispute handling, verified merchant terms, signing, secure hosting and independent production review. Closed test reviews are not payment confirmation.
