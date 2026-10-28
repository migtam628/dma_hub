# DMA HUB

**Professional Hybrid • Software & Device Management Platform**

[![Web and API CI](https://github.com/migtam628/dma_hub/actions/workflows/ci.yml/badge.svg)](https://github.com/migtam628/dma_hub/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/migtam628/dma_hub/actions/workflows/pages.yml/badge.svg)](https://github.com/migtam628/dma_hub/actions/workflows/pages.yml)
[![Release](https://github.com/migtam628/dma_hub/actions/workflows/release.yml/badge.svg)](https://github.com/migtam628/dma_hub/actions/workflows/release.yml)
[![Windows Build](https://github.com/migtam628/dma_hub/actions/workflows/desktop.yml/badge.svg)](https://github.com/migtam628/dma_hub/actions/workflows/desktop.yml)

> **Status: public alpha / active development.** The web UI runs with sample data. The local API supports accounts and versioned profile storage, but is **not yet production hardened**. There is **no signed Windows executable, live billing, working license service, or hardware control** in the published alpha. A Tauri desktop build workflow exists on `main`, but Windows installers are **unsigned preview artifacts** until verified and signed. Demo screens are not proof of connected services.

**[Live site — dma.moobee.lol](https://dma.moobee.lol/)** · **[Downloads](https://dma.moobee.lol/#/releases)** · **[Releases](https://github.com/migtam628/dma_hub/releases)** · **[Actions](https://github.com/migtam628/dma_hub/actions)** · **[Roadmap](docs/project-roadmap.md)**

**Hosting:** GitHub Pages is live with the GoDaddy-managed custom domain `dma.moobee.lol` and Enforce HTTPS. Frontend changes deploy automatically after a successful Pages workflow.

## Overview

DMA Hub is a modular, permission-first platform for discovering software, configuring supported tools, storing profiles, distributing releases, and monitoring devices with documented interfaces. The approved **Concept 3 — Professional Hybrid** design uses midnight navy, cyan actions, and restrained violet accents.

| Area | Current status | What's included |
|---|---|---|
| Public website | ✅ Web preview | Homepage, catalog, setup guides, live GitHub Releases download center |
| Customer workspace | 🧪 Mixed preview | Signed-in users can view API-backed manual test entitlements in My Software; other pages and logged-out previews remain sample data |
| Admin workspace | 🧪 Mixed preview | Local API admin-only Pricing & Test Access console; other admin pages remain synthetic |
| Configuration Studio | ✅ Local functionality | Edit settings, live preview, JSON import/export, browser storage |
| API | 🧪 Local alpha | Account sessions, schema v3, opt-in mail-backed verification/recovery, password changes, profiles, manual backup/restore tests |
| Cloud profiles | 🧪 Local API | Create, load, update, delete, optimistic version checks |
| Desktop companion | 🧪 Windows scaffold | Tauri shell source, NSIS build CI, launcher and diagnostics previews; no hardware APIs |
| Device adapters | 🧪 Read-only native serial discovery | Explicit Windows COM-port metadata scan; no port data access or device writes |
| Persistent catalog | 🧪 API alpha | Admin-gated product records, public published-only listings, versions and audit records; storefront still uses demo catalog |
| Pricing & entitlements | 🧪 API alpha | Versioned USD plans and manually issued, expiring test grants; customer-only access checks and audit logs |
| Payments/licensing | ⏳ Not connected | No actual checkout, subscription charges, license activation or payment webhook |
| Public hosting | ✅ Live | `https://dma.moobee.lol` via GitHub Pages; static preview **only** |

### Screens

| Website | Customer | Admin | Launcher & Studio |
|---|---|---|---|
| Home | Dashboard | Overview | Launcher UI preview |
| Product catalog | My Software | Users & Licenses | Device Center preview |
| Product details | Cloud Profiles | Product Management | Diagnostics preview |
| Hardware & Partners | Devices & Downloads | Release Center | Local settings editor |
| Documentation & Status | Billing preview | Service Readiness | Export/import profiles |

All demos mark simulated data and unavailable operations. Product names and logos in planning references do not imply affiliations or verified integrations.

## Architecture

```mermaid
flowchart LR
  Web["Vite + React Web UI"] --> UI["Shared UI Package"]
  Web -. "local API URL" .-> API["Node.js API (local)"]
  API --> DB[("SQLite")]
  API --> Sess["Sessions + Auth"]
  API --> Profiles["User-scoped Profiles"]
  CI["GitHub Actions CI"] --> Pages["GitHub Pages: static preview"]
  CI --> Releases["GitHub Releases: alpha web bundle"]
  Desktop["Tauri Windows Alpha"] -. "future trusted API connection" .-> API
```

**Important:** GitHub Pages is static hosting, not an API host. Don't publish the local API's SQLite database or environment files to Pages.

### Technology

- React 19, TypeScript, Vite 6, Tailwind CSS 4, lucide-react
- npm workspaces with `apps/web`, `apps/api`, `packages/ui`
- Local API: Node.js 22.16+, `node:http`, `node:sqlite`, transactional schema migrations, SQLite backup verification, scrypt password hashing, hashed opaque session tokens
- Continuous integration: GitHub Actions for build, source tests, API tests and type checking
- Hosting: static site via GitHub Pages, planned separate backend hosting
- Planned desktop: Tauri with Rust native device adapter layer

### Repository map

```text
dma_hub/
├── apps/
│   ├── web/               # React web preview
│   │   └── src/
│   └── api/               # Local-development HTTP + SQLite API
│       ├── src/
│       └── tests/
├── apps/desktop/           # Tauri 2 Windows shell and native build configuration
├── packages/
│   └── ui/                # Shared visual components and tokens
├── docs/                  # Three specification batches, designs, API docs
├── release/               # Version manifest + release notes
├── tests/                 # Repository integrity checks
└── .github/workflows/
    ├── ci.yml             # Test and build on pushes
    ├── pages.yml          # Deploy static web preview
    ├── release.yml        # Build and publish alpha ZIP/checksum
    └── desktop.yml        # Build unsigned Windows NSIS preview artifact
```

## Quick start

**Prerequisites:** Node.js 22.16 or later (required for built-in SQLite backup support), npm, Git.

```bash
git clone https://github.com/migtam628/dma_hub.git
cd dma_hub
npm install
npm run check
```

### Start the public UI

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/`. The default browser preview works without the backend; browse `#/dashboard` or `#/studio`.

### Start the local-development API

In another terminal in the repo root:

```bash
npm run dev:api
```

Defaults:

- HTTP address: `http://127.0.0.1:8787` (loopback only).
- Browser API requests: `http://localhost:8787` in development.
- Database: SQLite under `apps/api/data/` or the process working directory's `./data/`.
- CORS allowlist: `http://localhost:5173` (set `WEB_ORIGIN` to your actual frontend origin).

Use the Account view to register a **development-only** account and test profile syncing. The session token is kept in page memory rather than browser localStorage; page refresh signs you out. Never reuse a production password.

```bash
# Local readiness check
curl http://127.0.0.1:8787/healthz

# Frontend production bundle
npm run build
```

See [API reference](docs/api.md) for endpoints, authorization and limitations.

## Publishing GitHub Pages

The [Deploy GitHub Pages](https://github.com/migtam628/dma_hub/actions/workflows/pages.yml) workflow now runs on **every push to `main`** and can also be started manually. It validates and builds React/Vite with `npm run check` and publishes **only** `apps/web/dist`.

GitHub Pages must remain set to **Settings → Pages → Source: GitHub Actions**. Check the Pages workflow for a green build and deploy before describing a change as live.

**Custom domain:** [https://dma.moobee.lol](https://dma.moobee.lol) uses GoDaddy DNS (host `dma`, CNAME value `migtam628.github.io`) and Pages HTTPS enforcement. You do not need to edit DNS again for code deployments.

Inside the Windows companion, Device Center now enumerates OS-reported serial port metadata on demand. Browsers cannot access this native command. This is not a verified device-specific adapter.

The public site uses hash navigation (for example `https://dma.moobee.lol/#/releases`) and relative Vite asset paths. **No server-side login, API, or payment service is hosted on Pages.**

## GitHub Releases

The landing page, public **Downloads** route (`#/releases`), customer Downloads, and admin Release Center use published data from GitHub's public Releases API, including the Windows installer, checksum, and notes when available. Download URLs must point to official assets under `github.com/migtam628/dma_hub/releases/download/`. The website includes a direct link to the Releases page if the public API is rate-limited or unavailable. **No token is shipped to browsers.**

**Important:** The Windows alpha installer is **unsigned test software**, not a certified or production-ready distribution. Users should review release notes and verify its published `SHA256SUMS-windows.txt` digest. The browser app doesn't connect to any production backend.

[All releases](https://github.com/migtam628/dma_hub/releases) · [Alpha 2](https://github.com/migtam628/dma_hub/releases/tag/v0.2.0-alpha.2) · [Release workflow](https://github.com/migtam628/dma_hub/actions/workflows/release.yml)

Versioned releases are triggered by changes to `release/version.json` on `main` or by manual workflow dispatch.

- **v0.2.0-alpha.1** — initial tested static React preview ZIP, checksum and source archive.
- **Development on main after alpha.9** — plan pricing API and manually granted, user-scoped test entitlements. Not a payment, subscription or commercial license.
- **v0.2.0-alpha.9** — persisted admin-managed catalog records with separate published-only public API, optimistic version checks and auditable updates. Still no payment, license issuance or merchant CMS integration.
- **v0.2.0-alpha.8** — optional mail-backed verification/recovery, hashed one-time codes, schema v3 and account recovery UI; email provider configuration is required before use.\n- **v0.2.0-alpha.7** — transactional database migrations, verified manual backups/restore drills, disabled-account enforcement, password changes with all-session revocation and a refreshed engineering roadmap. The Windows build is still an unsigned prototype.
- **v0.2.0-alpha.6** — normalizes Windows installer filenames before GitHub upload and checksums, and verifies downloaded release artifacts against the build output.
- **v0.2.0-alpha.5** — fixes Windows installer verification and packages on-demand native COM-port discovery, account sessions and API safety checks. Installer is published only after the Windows release job succeeds.
- **v0.2.0-alpha.4** — introduces read-only Windows serial-port discovery, account-wide session revocation and additional API security tests. Requires Windows build and release checks to pass before the installer is published.
- **v0.2.0-alpha.3** — current Concept 3 website with public downloads/Release Center, custom-domain Pages and tested unsigned Windows preview. The tagged web and desktop artifacts include changes through this release commit.
- **v0.2.0-alpha.2** — tested web preview bundle, plus a real [unsigned Windows NSIS installer](https://github.com/migtam628/dma_hub/releases/tag/v0.2.0-alpha.2) available under the prerelease assets.
- Every web bundle has a SHA-256 checksum; a successfully uploaded Windows installer has its own `SHA256SUMS-windows.txt`.
- The release pipeline verifies that a tag belongs to its triggering commit before uploading Windows files. Re-running on an unrelated commit cannot replace artifacts associated with another tag.
- A GitHub prerelease is **not** a production software release. Signing, device QA, updater trust and deployment readiness are separate gates.

To create the next alpha, update `release/version.json` to a unique version and edit `release/notes.md`, then commit and push. The release workflow builds/tests the React project, packages the static site, creates the tag/release, then compiles Windows NSIS on a Windows runner.

### Admin Pricing & Test Access (local-development UI)

The authenticated admin workspace now includes a **Pricing & Test Access** page. A backend-authorized admin can create draft catalog products, publish or archive products, create immutable USD price plans, activate plans, and issue/revoke **manual, expiring test grants**. All mutations pass through the server-enforced admin endpoints and are audited. The screen requires an admin-provisioned account and remains separate from the public storefront demo.

This screen is **not a payment processor, production merchant CMS or real license generator**. Without the local API, it cannot perform operations.

### My Software — real test-access view

When signed in through the **local API**, My Software fetches only the authenticated user's entitlements from `GET /v1/me/entitlements` and clearly labels each as a **manual test grant** (active, scheduled, expired, revoked or unavailable). Loading and network failure states never imply access. Logged-out views remain a labeled design preview.

This does **not** install software, connect licenses, charge customers, or synchronize production accounts. The public GitHub Pages demo cannot access a server-side account API.

### Plan pricing and test entitlements (backend only)

The API can maintain USD plan amounts in integer cents and explicit billing periods, and lets authorized admins manually grant or revoke **test** entitlements with required expirations. Customer access checks are enforced by the API and isolated to the signed-in user. This does **not** process money, issue cryptographic licenses, or activate devices.

See [Pricing and test entitlements](docs/commerce-foundation.md) for endpoints and safeguards. GitHub Pages and the existing UI still display sample commercial data until a dedicated secured backend is deployed.

### Persistent product catalog (backend alpha)

The new `/v1/catalog/live` endpoint returns **only published products** stored in SQLite. Separate authenticated admin-only endpoints create and update draft/published/archived product records with optimistic version checks and audit records. The old `/v1/catalog` route and the website remain clearly labeled demo data until a server-backed storefront is connected.

Read [Catalog API](docs/catalog.md) for endpoints, permissions and limitations. Admin roles cannot be obtained via public signup. Prices, entitlements, checkout and production merchandising are not yet built.

### Email verification and password recovery (disabled until configured)

The API now supports expiring, single-use email-verification and password-recovery codes. Codes are stored as SHA-256 hashes; the browser prompts users to paste a code from their email. Password recovery revokes every active session.

A backend operator can optionally configure a verified Resend sending domain, server-only `RESEND_API_KEY`, `MAIL_FROM`, and `REQUIRE_EMAIL_VERIFICATION=1`. **Do not place email API keys into Vite/GitHub Pages**, and do not publicly host this development API. Without a mail transport, sign-in continues in local demo mode but recovery is explicitly unavailable.

See [Email authentication integration](docs/email-auth.md) for setup, test coverage and remaining production safeguards.

### SQLite migration and recovery tools (local API)

The API now applies tracked, transactional database migrations (schema v2) on startup. Existing data is retained; future or incompatible schemas fail closed.

```bash
# Use your actual DB_PATH and pre-create a private backups/ directory.
mkdir -m 700 -p backups
node apps/api/src/maintenance.mjs backup ./apps/api/data/dma-hub.sqlite ./backups/dma-hub-example.sqlite
node apps/api/src/maintenance.mjs verify ./backups/dma-hub-example.sqlite
```

The SQLite online backup command refuses overwriting an existing snapshot, checks database integrity, and writes a private file. See the [recovery runbook](docs/database-recovery.md) for restore drills and limitations. Off-host encrypted scheduling, operational monitoring, public mail delivery configuration and production safety testing remain **not implemented**. Email verification and recovery code paths exist but require a configured mail provider.

### Docker API preview

A separate [Docker Compose guide](docs/deployment.md) describes a **loopback-only** Node/SQLite API container with a named persistent volume, non-root service account, dropped capabilities and health checks.

```bash
docker compose up --build --wait -d api
curl -f http://127.0.0.1:8787/healthz
```

The [API Container Smoke workflow](https://github.com/migtam628/dma_hub/actions/workflows/api-container.yml) verifies that image. This does **not** mean the API is ready for public internet exposure.

## Tests and validation

```bash
npm run typecheck
npm run test
npm run build
npm run check
```

CI runs on pushes to `main` and pull requests. Verify the **Web and API CI** workflow is green before assuming a change is good.

## Security / project boundaries

- No unauthorized access, game-memory extraction, covert device operations or anti-cheat evasion.
- The demo catalog, products and device statuses are synthetic; no service activation is implied.
- Profile writes are owned by an authenticated account and guarded by per-profile version numbers.
- The local API must not be exposed to the public internet without TLS, account verification, migration strategy, secrets handling, abuse limits, backups and independent security review.
- Do not commit passwords, API keys, customer data, SQLite databases, or signing certificates.
- Before commercial launch, add genuine billing/licensing systems, published privacy and support policies, real product compatibility testing and a rollback plan.

## Design handoff and roadmap

- [Concept 3 — Batch 1](docs/concept-3-batch-1.md): public site and customer UX
- [Concept 3 — Batch 2](docs/concept-3-batch-2.md): admin, launcher and Studio
- [Concept 3 — Batch 3](docs/concept-3-batch-3.md): secondary screens and states
- [High-fidelity review v1](docs/design/concept-3-hifi-review-v1.md) and [v2](docs/design/concept-3-hifi-review-v2.md)
- [Roadmap](docs/project-roadmap.md), [API reference](docs/api.md), [Database recovery](docs/database-recovery.md), [Windows desktop build](docs/desktop.md), [Native serial discovery](docs/native-device-discovery.md), [Implementation milestone 1](README_IMPLEMENTATION.md)

## Tracking remaining milestones

- GitHub Pages activation — **resolved**. Custom domain, HTTPS and Pages deployment are operational.
- [Production API security](https://github.com/migtam628/dma_hub/issues/2) — mail provider setup, encrypted backups, distributed abuse protection and deployment review.
- [Signed Windows distribution](https://github.com/migtam628/dma_hub/issues/3) — publisher signatures and trusted updater.
- [First hardware adapter](https://github.com/migtam628/dma_hub/issues/4) — initial read-only serial metadata enumeration implemented; real-device tests and a device-specific adapter remain open.

## Windows alpha distribution verification

The current release is an **unsigned development preview**. On Windows CI the installer undergoes PE-header/size/version checks, an Authenticode status check, and SHA-256 hashing. The GitHub Release pipeline also downloads the published installer and checksum file back from GitHub and compares them to the locally built artifact.

- Check version consistency before packaging: `node scripts/check-release-metadata.mjs`.
- Check a local Windows installer: `./scripts/verify-windows-installer.ps1 -InstallerPath "path/to/installer.exe" -ExpectedVersion "0.2.0"` (PowerShell on Windows).
- Follow the [Windows installer QA checklist](docs/windows-installer-qa.md) for actual VM-based install/launch/uninstall tests.
- A successful automated checksum check **does not** establish that an installer is signed, malware-free, fully tested or production-ready. Publisher certificates, signed auto-updates, rollback and security hardening remain pending.

## Development workflow

Every meaningful implementation milestone should be tested, committed and pushed. The CI, Pages, and release workflows provide independent validation. **A successful workflow is not the same as a production-ready release**; outstanding milestones remain tracked explicitly.

**Project stage:** active alpha. Code, specifications and automated checks exist; the full platform is **not complete**.
