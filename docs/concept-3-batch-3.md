# DMA Hub — Concept 3 Professional Hybrid
## Batch 3: Secondary Screens and Shared Experience Specification

**Status:** Design specification; not implemented  
**Date:** 2026-10-27  
**Design baseline:** Concept 3 — Professional Hybrid  
**Audience:** Product/design, frontend, backend, Windows desktop, QA  
**Scope:** User-authorized software management, digital commerce, licensing, documented device integrations, configuration management, diagnostic tooling. No game-memory extraction, anti-cheat bypass, or unapproved device firmware manipulation is assumed or specified.

## 0. Product-wide UI contract

### Design tokens

| Token | Value | Use |
|---|---|---|
| `bg.canvas` | `#07111D` | Overall background |
| `bg.surface` | `#0D1A2A` | Panels, sidebars |
| `bg.elevated` | `#142337` | Nested cards/menus |
| `action.primary` | `#19B9CE` | Main actions, focus emphasis |
| `action.secondary` | `#778BFF` | Advanced/secondary accents |
| `state.success` | `#2EC18D` | Verified active/connected |
| `text.primary` | `#F5F9FC` | High-contrast content |
| `text.muted` | `#A6B3C5` | Supporting content (final WCAG validation needed) |
| `state.warning` | `#F0B44C` | Pending/degraded |
| `state.error` | `#F36C78` | Errors/destructive flows |

Spacing uses multiples of 4px, with primary increments 8/12/16/24/32. Corners: 10px controls, 16px cards, 20px dialogs. Default UI typography Inter; headings Space Grotesk or Sora, subject to font licensing and implementation review. Motion 120–220ms, respects reduced-motion. Do not communicate status solely through color. Keyboard order, visible focus, scalable text and contrast are acceptance criteria.

### Shared structure

- Storefront: editorial wide hero, top navigation, searchable commerce cards and documentation.
- Customer portal: 232–256px navigation sidebar, compact utility header, content 12-column grid, persistent status messaging.
- Admin: denser operations layout with advanced filters, bulk actions with confirmation, exports and audit trails.
- Windows launcher: desktop-first, minimum usable 1280x720, remembers panel sizes and has a non-destructive first-run wizard.
- Configuration Studio: persistent left navigation, central configurable schema-driven form, optional right live preview/validation inspector.
- Breakpoints to prototype: mobile 390px, tablet 768px, laptop 1366px, desktop 1600px, 200% text zoom.
- All examples and counters are placeholders unless returned by a live service. Never show fake uptime, sales, partner verification or connected-device status as fact.

### State vocabulary

`loading`, `ready`, `empty`, `offline`, `degraded`, `syncing`, `conflict`, `update-available`, `access-expired`, `unsupported`, `error`. Every interactive screen must specify which states are valid, what the user sees, and a safe recovery action. Component states include keyboard focus, disabled-with-reason, hover, selected, saving, success and error.

---

## 1. SF-03 — Hardware Catalog & Compatibility

**Route proposal:** `/hardware` and `/hardware/:slug`  
**User objective:** Understand which devices are supported and which software/OS versions they work with before buying or pairing.

**Layout:** Top title/intro and product-type tabs; left filter rail (desktop), right grid of hardware cards; compatibility comparison opens as full-width section rather than another card grid. On detail pages, split device photography/spec sheet with an anchored purchase/contact panel.

**Components:** Search; connection-type chips (USB, serial, HID, LAN); vendor/model selector; supported OS badges; support maturity (`verified`, `beta`, `planned`) with source/date; device gallery; model revision; requirements; documentation; adapter capability checklist; comparison table; compatibility notes; troubleshooting link.

**Key interactions:** Filter by OS/transport/vendor → select model → inspect tested versions → open setup guide → optionally compare two or three devices. 'Pair device' is shown only for supported adapter models and only inside installed client; browser offers handoff and guidance.

**Data contract (proposed):** `HardwareModel {id,vendor,model,revision,transports,osSupport,adapterStatus,verifiedAgainst,documentationUrl}`; `Compatibility {modelId,softwareId,releaseRange,driverVersion,verifiedAt,notes}`. Public read API distinct from pairing API.

**States/recovery:** Empty filter results allow reset; unknown revision states 'not verified'; compatibility stale shows last tested date; online catalog failure shows saved static docs; unsupported device prompts support request, not fabricated pairing.

**Acceptance:** Search/filter keyboard operable; matrix reflects model revisions; every supported badge has backing test evidence; no arbitrary executable/driver download from untrusted vendors.

## 2. SF-04 — Reseller / Partner Marketplace

**Route proposal:** `/partners` and `/partners/:slug`  
**User objective:** Compare authorized commercial partners, their approved products, regions, support and accepted checkout methods.

**Layout:** Two-column vendor directory as in supplied reference screenshot, with clearer hierarchy: logo/name/verified status on left, count/region/payment methods right, expansion chevron. Expansion reveals offered products, jurisdiction, support hours, policy and official visit link. Mobile: single-column accordion list.

**Components:** Search; partner tier and country filters; verified partner explanation tooltip; website links; review/approval timestamps; product count; optional icon-based payment method list with text alternatives; report listing; reseller onboarding CTA.

**Key interactions:** Expand/collapse one or multiple vendors without route loss; filter deep-linked in URL; open official reseller URL with external-link indicator; report inaccurate listing; sort alphabetically or by approved criteria—not fabricated popularity.

**Data contract:** `Partner {id,name,logo,verificationStatus,verifiedAt,regions,products,paymentMethods,publicUrl,supportUrl,policyUrl}`. Admin moderation publishes changes; partner role cannot self-mark verified.

**States/recovery:** Unverified and suspended listings clearly marked or excluded; empty marketplace encourages direct store; icon asset failure falls back to method label; invalid external URL blocked.

**Acceptance:** Approval state always server-driven; external links vetted and `rel=noopener noreferrer`; accessibility includes alt text and payment names; legal/commercial review before enabling payment/reseller features.

## 3. CU-03 — Cloud Profiles Library

**Route proposal:** `/dashboard/profiles` and `/dashboard/profiles/:id`  
**User objective:** Create, organize, version, back up and safely restore application configurations across registered installations.

**Layout:** Header with Create/Import; left smart filters (product, local/cloud, recently used); central profiles table/cards; right details drawer with version history, diff summary and sync log. Distinguish applied vs saved vs cloud-synced state.

**Components:** Profile label, owning product, schema version, device scope, sync timestamp, status, tags, search, bulk export/archive, safe restore dialog, conflict compare panel, revision timeline.

**Key interactions:** New profile → choose product/schema → edit → save locally → request sync → show confirmed server revision. Duplicate creates separate ID; restore generates new revision rather than destructive overwrite. Conflict resolution offers 'keep local', 'keep cloud', 'review changes' with explicit timestamps.

**Data contract:** `Profile {id,ownerId,productId,schemaVersion,title,tags,localRevision,cloudRevision,appliedRevision,updatedAt}`; `ProfileRevision {id,parentId,author,createdAt,changeSummary,contentHash}`. Proposed optimistic locking via ETag/revision number.

**States/recovery:** Offline local edit stays queued; upload failure preserves local draft; conflict does not silently overwrite; expired entitlement leaves authorized export path and restricts application-dependent edits according to policy.

**Acceptance:** Version restoration lossless; idempotent sync; no cross-account profile leakage; unsaved-change guard; import validates schema and size; secrets never exported unredacted.

## 4. CU-04 — Devices & Downloads

**Route proposals:** `/dashboard/devices`, `/dashboard/downloads`  
**User objective:** See registered endpoints and download authentic software with clear support/compatibility information.

**Layout:** Devices page: table of device name/type, status, last verified time, assigned software, firmware if reported; selected device opens inspector drawer. Downloads page: desktop installer/release cards with version, release channel, OS, published date, size, signed status and changelog. Distinct from the hardware storefront.

**Components:** Device pairing instruction modal; revoke connection confirmation; last-seen vs live status; rename; diagnostic request from paired desktop only with consent; platform selector; changelog; verification/checksum text; download history; archive links only when policy allows.

**Key interactions:** Install desktop → sign in → explicit pairing → device appears after server acknowledgment. Revoke shows affected sessions and requires confirmation; download starts through short-lived authenticated URL; updated install status is confirmed by desktop heartbeat, not inferred from click.

**Data contract:** `RegisteredEndpoint {id,ownerId,platform,displayName,capabilities,lastSeenAt,trustState,revokedAt}`; `ReleaseArtifact {id,productId,version,channel,platform,size,hash,signatureStatus,publishedAt}`. Never use raw hardware serial/IP as the primary display identifier.

**States/recovery:** Offline shows last-seen timestamp; expired signing manifest blocks download and retries; unsupported OS shows alternatives; transfer interrupted offers verified redownload.

**Acceptance:** Signed installer provenance apparent; revocation is enforced server-side; download URL expires; no secrets in client logs; keyboard-accessible dialogs.

## 5. AD-03 — Product & Plan Management

**Route proposals:** `/admin/products`, `/admin/plans`  
**User objective:** Manage catalog content and entitlements while safely controlling public visibility and billing implications.

**Layout:** Product table with thumbnail, status, release, visibility, attached plans; side preview/editor. Plan editor is separate, using a billing/entitlement matrix and clear renewal disclosures.

**Components:** Product drafts and publishing controls; SEO fields; media gallery; feature/compatibility schema; product-owner role; price/duration/currency; entitlement allocation; legacy plan labeling; visibility validation; publish diff/approval dialog.

**Key interactions:** Create draft → enter required info → preview customer-facing page → validate → publish. Plan changes present prospective vs existing-customer impact. Archived products retain customer access records and links where contractually appropriate.

**Data contract:** `Product`, `ProductRevision`, `Plan`, `EntitlementPolicy`, `PlanPriceVersion`. Billing provider ID only after supported payment onboarding; do not assume a provider is eligible for every product category.

**States/recovery:** Validation calls out missing media/compatibility/docs; duplicate SKU rejected; publish failure leaves draft; payments unavailable keep catalog informational.

**Acceptance:** Role restrictions enforced by API; monetary values server validated; changes audited; published and draft versions distinct; no accidental retroactive price change.

## 6. AD-04 — Release Center

**Route proposal:** `/admin/releases`  
**User objective:** Safely prepare, verify, stage, roll out and roll back desktop/software releases.

**Layout:** Release timeline by product and channel, large detail workspace for selected release, right rail showing signing, approvals, rollout rate and health. Release editor is a multi-stage wizard, not a generic form.

**Stages:** (1) Upload/associate CI artifact; (2) verify hash/signature and SBOM/dependencies; (3) changelog + compatibility; (4) internal smoke test; (5) staged rollout; (6) publish, pause or rollback. UI always distinguishes 'artifact uploaded' from 'artifact signed and approved'.

**Components:** Channel tabs (internal/beta/stable), status badges, release manifests, rollout slider, staged adoption chart, rollback confirmation, device/OS compatibility, release notes preview, approver history.

**Key interactions:** Upload artifact → automated validation → approval → release to pilot ring → inspect telemetry → promote or pause. Require second confirmation for broad rollout and rollback; do not allow unsigned/unverified updates into stable.

**Data contract:** `Release {id,productId,channel,version,artifactId,state,rolloutPercent,minimumClientVersion,createdBy,approvedBy}`; `Artifact {sha256,signature,platform,storageKey}`; `DeploymentEvent`.

**States/recovery:** Failed signature blocks release; degraded telemetry pauses promotion; missing release notes cannot publish; rollback references last known-good signed release, not arbitrary artifact.

**Acceptance:** Signature verification cannot be bypassed by UI; immutable artifact hashes; rollout audits; client update policy and server entitlement checks stay independent.

## 7. AD-05 — Support & Service Health

**Route proposals:** `/admin/support`, `/admin/system-status`  
**User objective:** Triage customer incidents without exposing private diagnostic data or conflating service uptime with client status.

**Layout:** Split-view support inbox with filters and right conversation detail; status page with separate API/payment/storage/update components, incident history and maintenance timeline.

**Components:** Support queue, SLA tag, ticket owner, category, platform/release association, sanitized attachments, internal note distinction, user consent status, service components, operational alert timeline, incident editor.

**Key interactions:** Assign ticket; request consent for diagnostic bundle; link known incident; publish sanitized status update; mark resolved after confirmation. Status reporting must distinguish measured uptime from unknown state.

**Data contract:** `Ticket`, `TicketMessage`, `DiagnosticAttachment`, `ServiceComponent`, `Incident`, `IncidentUpdate`, `AuditEvent`.

**States/recovery:** Missing telemetry shows 'No recent measurement'; attached logs redact tokens/IP where practical; ticket attachment scan fails closed; support escalation preserves history.

**Acceptance:** Public status data excludes user identities; support privileges least-privilege; ticket exports audited; retention and deletion rules defined.

## 8. WD-03 — Windows Diagnostics & Repair

**Windows route:** `app://diagnostics` (internal conceptual route, not a registered deep link)  
**User objective:** Identify and resolve environment, download, sync, and supported-device problems without guessing.

**Layout:** Health summary header, ordered diagnostic checks with pass/warn/fail, expandable technical findings, guided resolution in right rail, optional logs timeline below. Distinct from device pairing page.

**Checks:** OS/support matrix; current installer signature; app/service version; API reachability; session/license state; local storage permissions; clock skew; update channel; adapter presence and documented protocol readiness; profile sync queue. Include start/stop test and timestamps.

**Key interactions:** Run diagnostics → display individual check outcomes → click explain/fix guide → retry single check → optionally export sanitized report with preview and explicit consent. 'Repair' only re-verifies/reinstalls owned signed app assets, never makes covert system changes.

**Data contract:** `DiagnosticRun {id,startedAt,completedAt,checks[],exportConsent}`; `DiagnosticCheck {code,severity,result,summary,remediation,observedAt}`.

**States/recovery:** Offline does not cause all checks to appear failed; permission failures explain exactly what was blocked; driver/hardware unsupported marked rather than silently auto-installing; cancel cleans temporary data.

**Acceptance:** No privilege escalation or firmware write without explicit signed/authorized workflow; export reviewed and redacted; deterministic pass/warn/fail criteria; reconnect flow works after sleep/resume.

## 9. CS-03 — Configuration Validation & Preview

**Route:** Inside Windows Configuration Studio; mirrored read-only browser view if compatible.  
**User objective:** Know whether a selected profile can be applied to an authorized application/device safely.

**Layout:** Left editable categories; central 'Validation report' grouping errors, warnings and recommendations; right preview/summary of affected permitted UI or device controls. Top sticky save/apply actions with differentiated state labels.

**Components:** Schema version banner, capability readiness chips, diff from applied version, invalid setting list, focus-to-control links, configuration preview, conflict resolver, save draft, validate again, apply, revert.

**Validation pipeline (proposed):** `parse → schema check → range/type check → cross-setting constraints → compatibility check → dry-run preview → user apply`. No changes to external software until an explicitly supported adapter accepts the validated profile.

**Key interactions:** Modify one field → debounce local validation → Save Draft → review blockers → Apply only when target available/valid → confirm adapter acknowledgment and applied revision. Preview is a simulation unless fed by a permitted client API, and must be labeled accordingly.

**Data contract:** `ConfigSchema`, `CapabilityManifest`, `ValidationIssue {path,code,severity,message,fixHint}`, `AppliedProfileReceipt`.

**States/recovery:** Apply failed restores previously known-good state when adapter allows transactional rollback; unsupported setting disabled with reason; remote/offline changes queue as draft, not falsely 'Applied'.

**Acceptance:** No silent coercion of invalid values; warning override rules product-defined; applied state comes from acknowledgments; unsaved edits clearly distinguish from cloud sync status.

## 10. XS-01 — Shared UI States, Dialogs, and Wizards

### Dialog inventory

- Confirm dangerous action: user impact, named resource, typed confirmation for high-risk release/license actions, irreversible warning.
- Session expired: sign in again, preserve unsaved draft where possible.
- Pair device: user-visible pairing code, expiration, explicit approval in desktop, revoke route.
- Unsaved profile: Save / Discard / Cancel; clarify local vs cloud.
- Sync conflict: side-by-side version diff, timestamp and origin, no automatic overwrite.
- Update available: version, size, changelog, signed source, Update / Later.
- Offline transition: continue local draft, disable server-required actions, show retry state.
- Unsupported hardware/software: explain tested devices and contact/support options.
- Release approval: security checks, expected audience, rollback path and audit details.

### Shared feedback contract

Every operation must show pending feedback and then confirmed success or a specific error. Optimistic UI is allowed only for reversible actions; never display 'paired', 'license active', 'installed', 'published', 'applied' or 'synced' before authoritative confirmation. Avoid destructive modal stacking; preserve keyboard focus on close; live-region announcements for important state changes.

### First-run experience

1. Welcome + terms/privacy links.
2. Sign in via secure external browser flow with PKCE (if supported by chosen identity provider).
3. Explain optional diagnostics and consent.
4. Show client minimum requirements and release channel.
5. Discover only documented supported devices with explicit user action.
6. Offer default profile and local sample workspace.
7. Finish with accurate readiness summary and links to launch/repair/docs.

### Error-state classification

| Error | UI treatment | Safe action |
|---|---|---|
| API unreachable | Non-blocking banner unless authentication required | Retry later; offline draft |
| Entitlement expired | Contextual access message | View terms/renewal |
| Artifact invalid signature | Blocking security alert | Cancel; report |
| Device not recognized | Unsupported device panel | Model guide / support |
| Profile schema outdated | Migration preview | Backup and migrate |
| Cloud revision conflict | Side-by-side comparison | Resolve explicitly |
| Payment unavailable | Honest service notice | Try supported alternative later |
| Permission denied | Role-specific explanation | Request access |

---

## 11. Screen coverage and dependencies

| Screen | Priority | Depends on | Implementation surface |
|---|---|---|---|
| SF-03 Hardware Catalog | P1 | Device catalog model | Web public |
| SF-04 Partner Directory | P2 | Partner verification workflow | Web public |
| CU-03 Cloud Profiles | P0 | Auth, profile version API | Customer web + client |
| CU-04 Devices & Downloads | P0 | Entitlements, pairing, signed releases | Customer web |
| AD-03 Products & Plans | P0 | Product/plan schemas, RBAC | Admin web |
| AD-04 Release Center | P0 | CI artifacts, signatures, approvals | Admin web |
| AD-05 Support & Health | P1 | Ticketing, monitoring | Admin web |
| WD-03 Diagnostics | P0 | Desktop client, capability probing | Tauri Windows |
| CS-03 Validation & Preview | P0 | Settings schemas, adapter receipts | Tauri Windows |
| XS-01 States/Wizards | P0 | Shared design components | All surfaces |

P0 = MVP essential; P1 = early enhancement; P2 = later commercial extension. Features are conceptual until product/device use case is selected and legally/technically assessed.

## 12. Cross-surface UX contract

**Activation sequence:** purchase/access grant → entitlement API confirms → library exposes product → signed download authorized → desktop install verified → user-approved endpoint pairing → supported adapter present → validated profile → adapter acknowledgment → dashboard shows last confirmed applied state.

**Roles:** visitor; customer; support; catalog operator; release manager; finance operator; administrator; partner/reseller. Each API must enforce permissions server-side, not through hidden menu items.

**Data integrity:** Every user-visible date/time displays timezone; every status has source and last-updated timestamp when meaningful. For actions spanning cloud and local client, show pending transitions rather than fake instant success.

**Accessibility targets:** WCAG 2.2 AA for web surfaces; Windows keyboard navigation, reasonable touch targets, 200% text zoom; high contrast; reduced motion; screen-reader announcements of critical operations.

**Security/privacy gates:** Authenticated uploads and short-lived URLs; signing/verification for installers and updates; release approval; malware scanning for uploaded attachments; least-privilege diagnostics; user-consented device registration; token redaction; privacy disclosures; independent compliance review of payment providers and product categories.

## 13. Proposed acceptance-test scenarios

1. Search unsupported hardware revision, verify no false compatibility badge.
2. Expand a reseller card and verify approved status plus external-link label.
3. Edit same cloud profile on two clients, trigger and resolve conflict without data loss.
4. Revoke a paired endpoint while offline; confirm server revocation blocks later access.
5. Publish product draft only after required fields/role checks pass.
6. Attempt to publish unsigned update; ensure UI and API reject.
7. Simulate API outage: launcher preserves a local draft and clearly displays offline.
8. Export diagnostics: preview contents, redact secrets, require consent.
9. Apply invalid profile: block, focus the offending control, preserve original applied profile.
10. Run all flows using keyboard only and on 390px / 1366px / 200% zoom.

## 14. What remains before implementation

1. High-fidelity review: full-size layouts for the 10 Batch 1/2 priority screens, then these secondary screens. Verify visual uniqueness between Product, Inventory/Devices, Billing and Release pages.
2. Confirm the legitimate Windows application + first documented hardware adapter. This governs capability schema and V1 success criteria.
3. Select payment provider after eligibility/compliance assessment; choose auth/backend stack after security review.
4. Approve entity schema, API contracts, design component library, and release process.
5. Then implement isolated milestones behind tests and feature flags, beginning with auth/entitlement/library/profile stub before hardware integration.

**Design signoff rule:** No code implementation begins until product scope, design, supported first-party/authorized integration and security gates are approved. This document does not claim any screen or device behavior has been implemented.