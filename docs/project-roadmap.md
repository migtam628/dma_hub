# DMA Hub — Engineering Roadmap and Reality Check

**Updated:** October 29, 2026  
**Project:** [migtam628/dma_hub](https://github.com/migtam628/dma_hub)  
**Approved UI:** Concept 3 — Professional Hybrid  
**Status:** Functional alpha with a public static preview and unsigned Windows installer. **Not production ready.**

## Gaming DMA Cheats division — scope and current status

The storefront now includes game-first `#/games` discovery and dedicated title pages, supported by schema v13 administrator-managed software-to-game links. Ten game categories are planning-only. The published-only API and UI never imply working game cheats when none exist. The real game modules, hardware adapters, tested compatibility, safe launcher integration, downloads, payments and licensing remain unimplemented. See [Gaming DMA Cheats architecture](games-dma-cheats.md).

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

### October 31 — gaming DMA storefront foundation (schema v13)

- Public DMA Cheats game discovery and title pages built on the Concept 3 storefront, plus a landing page/navigation entry point.
- Additive database game associations, server validation/admin role restriction, versioned updates, published-only listings and privacy tests.
- Planned game titles are not working software; the static Pages site has no connected backend.
- Next: verified game/product compatibility matrix and reviewed release asset mapping, not unsupported anti-cheat or device-identity claims.

### October 31 — game compatibility QA and evidence workflow (schema v14)

- Additive SQLite review/event tables preserve existing game/product associations.
- Operators can create draft records scoped to an exact product, game build, OS and hardware, then attest or withdraw using optimistic version checks.
- Public game pages fail closed: only operator-reviewed current product versions are shown, and internal QA evidence references are never exposed.
- Changes to product information invalidate prior reviewed records until a new draft/review cycle completes.
- Unfinished: independent hardware/game QA, authentic publisher-owned builds, real licensed delivery, signed distribution, payment/identity hosting, operational security and merchant policy review.

### October 31 — GitHub source-metadata provenance registry (schema v15)

- Added server-pinned GitHub Releases metadata comparison by exact release tag and filename with SHA-256 digest requirement. Unknown or mismatched metadata cannot become `metadata_matched`.
- Release asset records are tied to operator-reviewed, current game/build compatibility; when a review/product changes, the older asset metadata is automatically excluded from public game pages.
- Admin Game Assets queue uses versioned create/match/withdraw actions, immutable event history and strict RBAC.
- Public pages show provenance facts only: no user download URLs, executable permission, signature validation, binary safety certification, entitlement, or actual game cheat integration.
- Next: independent downloaded-byte verification plus publisher signature/provenance, release artifact QA, authorization and revocation design, and secure hosting. Distinguish these gates from a successful GitHub metadata match.

### November 1 — offline artifact hash and publisher signature verifier

- Added a strict offline CLI checking actual local file SHA-256/byte length and a detached Ed25519 manifest signature against an independently pinned publisher public key.
- An empty trust registry explicitly blocks unverified publishers. Revoked/missing keys, tampering and manifest mismatches fail closed; synthetic test keys never become production trust anchors.
- This does not change game-product API states, enable downloads, certify game compatibility or scan software for malware.
- Next production gates: verified publisher key onboarding, independent platform/game hardware QA, signed release attestations, trusted hosting/access controls, and revocation/rollback testing.

### November 1 — Alpha 24 publisher trust fingerprint and verification hardening

- Added offline Ed25519 public-key fingerprint inspection; the command does not mutate the trust registry or claim identity verification.
- Publisher trust registry v2 requires the canonical SPKI SHA-256 fingerprint to match the pinned public key, rejects duplicate trust anchors, private PEM, invalid algorithms and unknown fields.
- Artifact hashing uses a regular file handle and before/after file metadata checks to reduce path-replacement/time-of-check risks. This only validates a point-in-time local file snapshot.
- Real publisher identity onboarding remains blocked without independently verified key material and human review; no automatic license, download or game-cheat execution is enabled.

### November 1 — Alpha 25 game/hardware QA evidence journal (schema v16)

- Added versioned, append-only manual QA observations for exact game build, Windows build, hardware/firmware and three test scopes.
- Admin QA Lab records pass, fail, or retest required with authorization declaration, private evidence and notes; the public game page shows current operator-reported status only and warns that nothing is independently certified.
- New results supersede prior results within a scope, and old review/product versions are automatically omitted from public status responses. API tests cover stale invalidation, role restrictions, negative outcome precedence and immutable records.
- Next gates: independent test infrastructure, real owner/publisher permissions, patch detection, verified real hardware/software data, signed binary distribution policy, and production hosting. No game cheat executable is implemented.

### November 1 — Alpha 26 buyer setup/requirements workflow

- Completed research of OverDMA, CamUnlocks, and Blurred public product/support experiences. SSZ was inaccessible and no feature claims were inferred. See `docs/competitive-reference-research.md`.
- Added responsive, browser-local three-stage customer Setup Planner with versioned/sanitized local inventory state, OS/model/game-build identification, six-item checklist, hardcoded non-approval gates and actionable follow-ups.
- Export JSON, text, copy and browser Print/PDF without backend, license issuance, unsupported hardware connection claims or automatic download; unit tests cover unknown/missing status and fail-closed compatibility.
- Follow-up priorities: authenticated support ticket operations, production hosting, payment onboarding, permissions, real software/game/hardware QA, signed fulfillment, audit and monitoring. None should claim full production readiness until independently verified.

### November 1 — Alpha 27 authenticated support ticket lifecycle (schema v17)

- Implemented real private tickets, initial messages, owner-only views, staff queue, staff/customer replies, and ticket status transitions.
- Server-side customer authorization and role restrictions, per-ticket If-Match conflict guards, active ticket/message limits, append-only communication and event audit.
- Updated customer Support and Admin Support Tickets UI with local API lifecycle and explicit no-email/no-SLA disclaimers. Tests cover privacy, closure, status audit and optimistic conflicts.
- External gates: deploy production API with secure authentication, configure real email and notification provider, staffing/SLA policies, moderation and retention/compliance, and support analytics. Do not market 24/7 support until staffed.

### November 1 — Alpha 28 private containerized API staging foundation

- New Docker Compose API deployment with loopback-only host port 127.0.0.1:8787, persistent SQLite volume, read-only container root, reduced capabilities, health check and restart policy.
- Explicit staging.env setup (never committed), deploy and verify scripts, SQLite online snapshot verification/export script with file-mode protections and off-host encryption warning.
- GitHub Actions private Compose smoke boots API and verifies health, then destroys disposable CI storage. Node tests assert safe network defaults.
- No DNS, TLS/proxy exposure, email provider, user-hosted production API or public payment service has been deployed. Production API access requires security review and external user-owned environment configuration.

### November 1 — Alpha 29 first game pilot: Call of Duty / Warzone PC

- Selected Warzone PC as the first concrete Call of Duty pilot edition, pending confirmation of the user's actual game client and installed build. Official Activision requirements and enforcement policy linked in `docs/call-of-duty-warzone-pilot.md`.
- Created a live, local browser questionnaire, fail-closed RAM/VRAM/SSD and TPM/Secure Boot/DirectX12/AVX/broadband readiness review, versioned input validation, and JSON/TXT/clipboard/print reports.
- Activision's **November 6, 2026** Warzone/MW4 Season 1 update window triggers a new exact-build review; no assumption a scheduled update actually shipped, no automatic compatibility claims.
- Still blocked: authorized real Windows PC hardware/build evidence, game publisher/software rights, independent QA, real signed software artifact and commercial delivery. No game-modification or anti-cheat bypass code is included.

- Added a server-side conservative Call of Duty patch gate for three public record families. When the announced integration date arrives, pre-window reviews are hidden until operator re-attestation; QA and asset records must be re-established on the new version. Synthetic regression tests cover hiding and re-review without fake production evidence.

### November 1 — Alpha 30 Call of Duty multi-title Xbox/PC capability model

- Extended the selected Call of Duty pilot to Warzone, Modern Warfare II, III, 4, and Black Ops 6 and 7. Official Xbox/Activision sources ground Windows PC, Xbox Series X|S and Xbox One availability; game store listings are never represented as tested software compatibility.
- Public `#/games/call-of-duty/platforms` route compares a user-selected Xbox family, browser/customer services, PC launcher, normal Remote Play/capture, and prohibited/unsupported console game-memory/input changes. Source links and limitations included.
- Xbox One Warzone's announced Season 1 retirement flags a post-window live status recheck. Modern Warfare 4 Xbox One is not listed; MW4 Play Anywhere only applies to the eligible Xbox/Windows digital game purchase, not DMA Hub software.
- Still requires actual console model, exact game builds, Edge/web checks on hardware, optional capture/Remote Play QA and legitimate customer backend; no direct Xbox game tool, DMA memory access or game cheats supported.

### November 1 — Alpha 31 Xbox device QA workbook

- Added a model-neutral field-testing route for Xbox Series X/S, Xbox One, One S and One X. A local worksheet records exact game/build, Xbox OS version, controller/display, date and actual Edge/browser/optional companion-PC observations.
- Strict versioned field validation; only explicit physical-console test declarations, exact model/build/OS/date, meaningful notes and at least one observed pass/fail/blocker permit saving a **local operator report**. Default answers are all untested.
- Stores up to 25 operator observations only in browser localStorage, with optional HTTPS evidence references, TXT/JSON/clipboard/print handoffs, JSON draft import and local deletion. No API upload, no fabricated results, no trusted certification.
- Real Xbox browser, title/service availability and controller testing remain user-owned hardware acceptance tasks; the Windows installer is not a native Xbox app. See `docs/xbox-device-qa-workbook.md`.

### November 1 — Alpha 32 privileged Xbox QA evidence intake (schema v18)

- Created private local API administrative Xbox test evidence ingestion from exported v1 JSON; strict server-side field validation, deterministic SHA-256 duplicate blocking, immutable source submissions and separate append-only `submitted → triaged / retest_required` event history.
- Added administrator-only GET list/detail, POST import, PATCH review endpoints with `If-Match` optimistic versioning, RBAC enforcement, privacy exclusions and audit records. No public endpoint returns private field evidence or turns operator triage into compatibility approval.
- Added **Admin → Xbox QA Intake** React screen with explicit file selection/preview/confirm import, private report review, note capture and versioned triage; updated backup integrity checks and v17→v18 migrations.
- Still dependent on real physical console test evidence and trusted human review, separately hosted secure API, and policy for retention. This is not independent device certification and does not enable any third-party game software or downloads.
