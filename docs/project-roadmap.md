# DMA Hub — Architecture & Documentation-First Roadmap

**Date:** 2026-10-27  
**Status:** Planning only; repository was empty at review (GitHub returned no contents and no commit history).  
**Design:** Concept 3 Professional Hybrid  
**Working title:** DMA Hub — name/product positioning subject to confirmation.

## Outcome

One cohesive public storefront, customer portal, admin dashboard, and Windows Tauri companion, backed by a permissioned modular TypeScript API and versioned configuration/profile model. This is an original, authorized-software platform, not a copy of another vendor's proprietary implementation.

## Repository layout — proposed, NOT present yet

```text
dma_hub/
  README.md
  docs/
    concept-3-batch-3.md
    project-roadmap.md
    concept-3-batch-1.md       # add reviewed prior spec later
    concept-3-batch-2.md       # add reviewed prior spec later
    design-tokens.md            # future approved design token export
    architecture.md             # future ADR and threat model
    api-contracts.md            # future OpenAPI and realtime events
    device-adapter-contract.md  # future documented device integrations
  apps/
    storefront/                 # proposed React application
    customer/                   # proposed React application
    admin/                      # proposed React application
    desktop/                    # proposed Tauri React/Rust
  services/
    api/                        # proposed Node/TypeScript modular API
  packages/
    ui/                         # shared tokens and components
    contracts/                  # runtime validation and types
    config-schema/              # configuration and migrations
  infrastructure/
    docker/
    workflows/
```

**Note:** The folders under `apps/`, `services/`, `packages/`, and `infrastructure/` are illustrative future structure only; do not create them until planning approval.

## Domain model — proposed

- Identity: `User`, `Role`, `Session`, `DeviceRegistration`.
- Catalog: `Product`, `ProductRevision`, `Plan`, `PlanPriceVersion`, `Partner`.
- Access: `Entitlement`, `LicenseActivation`, `AccessEvent`.
- Downloads: `Release`, `ReleaseArtifact`, `ReleaseRollout`, `UpdateEvent`.
- Settings: `ConfigSchema`, `ConfigProfile`, `ProfileRevision`, `AppliedProfileReceipt`.
- Hardware: `HardwareModel`, `CompatibilityTest`, `AdapterCapability`.
- Operations: `SupportTicket`, `DiagnosticReport`, `ServiceIncident`, `AuditEvent`.

Use real state transitions (not optimistic claims) and RBAC on backend. Select PostgreSQL as default relational database, Redis/queue only if justified; Tauri/Rust for Windows, Node/TypeScript for backend, React/Tailwind for web. Auth system selection remains a decision, not a deployed fact.

## Engineering phases and gates

| Phase | Output | Definition of done |
|---|---|---|
| 0. Scope/design | Signed-off user stories, screen specs, visual board | Product use case & supported integration decided |
| 1. Foundation | Monorepo, CI, app shells, auth/RBAC | Tests, threat model, observability baseline |
| 2. Store/portal | Public site, library, accounts, plan catalog | Accessible responsive flows and data contracts |
| 3. Licensing/releases | Entitlements, signed artifacts, staged releases | No unsigned updates, auditable grants/revocations |
| 4. Windows companion | Install, sign-in, update, pairing, diagnostics | Tested installer, recovery and privacy controls |
| 5. Config Studio | Schema-driven settings, versioned cloud profiles | Conflict resolution and verified apply receipts |
| 6. Supported adapter | One documented/authorized device/application | Compatibility test suite and hardware evidence |
| 7. Admin/operations | Catalog, plans, releases, tickets, audit | RBAC, approval flows, incident handling |
| 8. Beta QA | User testing, hardening, documentation | Backup/restore, accessibility, deployment checklists |

## Candidate MVP scope

- Included: platform account, library, clear entitlement state, signed downloads, updates, cloud profiles, diagnostics and one authorized first-party/documented adapter.
- Deferred: reseller payouts, plugin marketplace, multi-provider commerce, complex overlay engine, broad vendor/hardware support and automation beyond validated product need.
- Explicitly excluded from generic MVP: clandestine memory acquisition, anti-cheat evasion, impersonation of protected input devices and unauthorized firmware operations.

## Repo readiness review (observed via GitHub connector)

- Repo: `migtam628/dma_hub` (public).
- Configured default branch: `main`.
- GitHub repository size reported as `0`.
- Root contents request returned `404` with `This repository is empty.`.
- Recent commits query returned `409` with `Git Repository is empty.`.
- No dependency tree, source, tests or CI existed to assess at this checkpoint.

## Next decisions

1. Confirm product description and supported authorized Windows application or hardware model for pilot.
2. Approve user-facing brand naming, admin permissions, commercial model and payments feasibility.
3. Complete separate high-fidelity comps for all five application surfaces.
4. Choose initial release platform/hosting and identity provider.
5. Open implementation branch only after design signoff; never claim code has been written from planning artifacts.