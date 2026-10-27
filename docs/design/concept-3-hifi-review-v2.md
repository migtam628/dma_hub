# DMA Hub — Concept 3 | High-Fidelity Review v2

**Status:** Static visual design and UX specification. **Not implemented.**  
**Product direction:** Professional Hybrid (approved).  
**Repo:** https://github.com/migtam628/dma_hub  
**Date:** 2026-10-27  
**Scope:** Six secondary/responsive screens complementing the five v1 foundation screens.

## 1. What this design package includes

| ID | PNG | Intended surface | Primary workflow |
|---|---|---|---|
| HIFI-06 | `06_Product_Detail.png` | Storefront web | Review a product, verify requirements, choose a plan |
| HIFI-07 | `07_Device_Troubleshooting.png` | Windows companion | Diagnose and recover an authorized device connection |
| HIFI-08 | `08_Cloud_Sync_Conflict.png` | Customer web / companion | Compare local vs cloud profile revisions without silent overwrites |
| HIFI-09 | `09_Admin_Users_Licenses.png` | Admin web | Find customers, inspect entitlements, review access actions |
| HIFI-10 | `10_Mobile_Storefront.png` | Mobile web | Browse platform/software from a phone |
| HIFI-11 | `11_Mobile_Customer_Dashboard.png` | Mobile web | Check subscription, products, and verified device health |
| SHEET | `00_Review_Board_v2.png` | Review board | All six screens at a glance |

Screens 06–09 are **1600 × 1000 px** and screens 10–11 are **430 × 932 px**. They use original, locally-rendered interface illustrations, not screenshots of a functioning app. Product names, prices, customer identities and device statuses are illustrative. No active subscription, paid processing, driver, diagnostic tool, application build or installer is implied.

## 2. Shared approved design language

- **Foundation:** midnight-navy `#050D17`, nested dark-blue panels `#0B1A2A`, elevated panels `#0E2132`, thin borders `#223B50`.
- **Primary:** cyan `#24BCD2` / `#25C2D7` for main actions and active navigation.
- **Secondary:** violet `#9686FF` for alternate/configuration states only.
- **Semantic:** green `#4EE0AC` verified success, amber `#FFC774` needs action, red `#FF9EAE` failure/restricted action.
- **Typeface:** Inter-like sans, dense operational tables and large editorial headings; all numbers should eventually use tabular numeral alignment.
- **Rules:** same button shapes, chip semantics, field styling, 12–16 px card radii, roughly 235 px desktop rail, and consistent 1 px separators.
- **Semantics:** never rely on color alone; include state labels, timestamps, and clear explanatory text.
- **Brand:** "DMA HUB" is a working name and can be changed centrally. Do not imply affiliation with competitors.

## 3. HIFI-06 — Product detail

### Purpose / page hierarchy

1. Site navigation and breadcrumb.
2. Main media preview plus product identity, short value proposition and signed release badge.
3. Plan selection, license disclosures, and persistent primary CTA.
4. Gallery thumbnails and secondary tabs (`Overview`, `Features`, `Requirements`, `Releases`, `Documentation`, `FAQ`).
5. Functional benefits and explicit compatibility checklist.

### Interactions

- Changing a plan must update **amount, duration, renewal interval, tax disclosure, eligible region, and entitlement scope** at once; none are hard-coded in production.
- `Continue to checkout` goes to hosted/approved payment flow if eligible, else shows reason, not a broken CTA.
- Users who already own the entitlement see `Open My Software` and renewal/manage controls.
- Image/gallery selection updates the hero preview; tabs change associated structured content while preserving scroll/readability.
- Compatibility status is based on published supported software versions and explicitly verified device models, not an unqualified "works with all" claim.

### States / accessibility

`available`, `coming-soon`, `out-of-stock` (hardware), `not-compatible`, `already-owned`, `unavailable-in-region`, `payment-unavailable`, and `error`. Keyboard reachability, readable disclosure text, and no deceptive urgency or fake reviews.

### Data contracts (proposed)

`Product{id,slug,title,summary,category,images,feature_groups,requirements,compatibility,documents}`; `Plan{id,product_id,period,price,currency,renewal,entitlements,status}`; `Release{version,channel,published_at,checksum,signature_status}`; `UserEntitlement{status,expires_at,activation_count}`.

## 4. HIFI-07 — Windows device troubleshooting

### Purpose / composition

- Native title bar plus compact launcher navigation.
- High-signal failure banner with device identity, last verified timestamp and diagnostic code.
- Left: ordered checks with `pass`, `fail`, `skipped`, `running` or `unknown` labels.
- Right: step-by-step, reversible recovery instructions, context-sensitive actions.
- Bottom: logs with redacted export and support handoff.

### Interactions / rules

- `Run diagnostics`: checks only the supported, user-authorized device interface and service connections; requires the user to initiate the action.
- `Rescan`: refreshes supported device discovery with a visible spinner, timeout, and new timestamp.
- `Export redacted report`: omits authentication secrets, license keys, raw serial numbers, and unapproved personal data.
- Each check reports measured status and last run; if offline, show a dated last-known state separately.
- Never automatically reinstall drivers, flash firmware, run elevated changes, or alter device modes without explicit consent and a supported path.

### States / quality gate

No device present; connection interrupted; incorrect driver; permission denied; API outage; unsupported model; pass/ready. Diagnostics have retryable errors, no indefinite loading, no fake `connected` green state, and clear escalation to support.

## 5. HIFI-08 — Cloud profile conflict

### Purpose / comparison

Conflict UI is a deliberate **blocking review experience** when local and remote edits diverge. It separates draft/saved locally/synced/applied state and treats the cloud as **a peer revision**, not a truth source.

### Interactions

- Compare `local_revision` vs `remote_revision`, `updated_at`, `device_id` (display label only), and a summary of changed fields.
- `Keep local`: writes a new cloud revision only after revalidating the remote ETag/revision ID. Warn before replacing the cloud active head.
- `Keep cloud`: archives the local draft before applying cloud data. Never silently discard it.
- `Save both versions`: default safe action; creates an explicitly named fork and leaves the previously active profile intact.
- `Cancel / Review later`: saves user work and retains an actionable conflict badge.
- No automatic overwrite when offline, stale or when a compare-and-swap fails; reopen the comparison with fresh content.

### Data contracts

`Profile{id,product_id,owner_id,name,active_revision_id}`; `Revision{id,profile_id,parent_id,source_device,schema_version,payload_hash,created_at}`; `SyncConflict{base_revision,local_revision,remote_revision,detected_at,status}`. On divergent schema versions, show incompatibility and an upgrade/migration path.

## 6. HIFI-09 — Admin users & licenses

### Purpose / composition

- Admin-wide navigation, page-level actions, operational metric row.
- Left: searchable/sortable, filterable and paginated user directory.
- Right: selected account inspector with entitlement records, registration counts, audit history and explicit review action.
- Customer emails and names are sample data in this mockup; use RBAC and least-privilege access in implementation.

### Interactions

- Search uses stable pagination and clear result counts; maintain filters when opening/closing a detail drawer.
- Entitlement edits require a reason, a confirmation dialog, role permission check and immutable log entry.
- License revoke or suspension shows customer impact, effective time, and whether an override can be reversed.
- Billing/payment truth is server-validated; admins cannot create arbitrary fulfilled orders by editing client UI.
- Sensitive fields are redacted by default; administrative access is logged.

### Data contracts

`User{public_id,status,email,created_at,last_login_at}`; `Entitlement{product_id,state,expires_at,max_devices}`; `DeviceRegistration{public_id,verified_last_seen}`; `AdminAudit{id,actor,action,target,reason,timestamp}`. Revenue metrics are strictly illustrative until real payment data exists.

## 7. HIFI-10 — Responsive mobile storefront

**Target reference:** 430 × 932, with testing at 320, 375, 390, 430, 768 and 1024 logical px.

- Header collapses navigation to an accessible menu; search remains a separate action.
- Hero becomes single-column, maintains editorial hierarchy and practical CTA widths.
- Dashboard illustrative preview is simplified rather than squeezed into unreadable desktop content.
- Product cards form a two-column grid at 430 px and one column if card text/zoom would truncate.
- No horizontal overflow, focus trapped properly inside open menus, supports 200% font/zoom, target areas around 44 × 44 px.
- Critical product/legal/payment terms are not hidden on mobile.

## 8. HIFI-11 — Responsive mobile customer dashboard

- Use a phone-friendly bottom navigation for Overview, Software, Profiles, Devices and More (do not overcrowd with nine tabs).
- Show the highest-priority action first: connection problem > urgent access issue > required update > setup > normal library.
- Show verified device status and `last checked` time; handle stale/offline explicitly.
- Keep short product list, notification badges and links to full information, not dense desktop tables.
- Billing and security remain accessible under More with clear labels; never omit cancellation or contact/support paths.
- Mobile browser must not claim to remotely launch a Windows program unless a verified pairing/deep-link mechanism exists.

## 9. Cross-surface state and component contracts

| Component | Must support |
|---|---|
| Primary button | idle, hover/focus, disabled with reason, loading, success/failure feedback |
| Badge | verified online, stale last-known, warning, error, unknown; labeled semantically |
| Async panel | skeleton, complete, empty, unauthorized, unavailable, retry |
| Form field | default, focus, invalid, readonly, helper text and server error |
| Revision viewer | local/cloud metadata, diff, schema mismatch, conflict, retry |
| Diagnostic check | queued, running, passed, failed, skipped, timed out |
| Entitlement | active, grace, expired, suspended, revoked, provisioning |
| Release | signed, signature invalid, downloading, staged, installed, rollback available |

## 10. Accessibility / QA acceptance

1. Baseline WCAG 2.2 AA for customer/admin web: contrast, semantic labels, keyboard flow, visible focus, error hints, accessible dialogs and tab order.
2. Screen-reader announcements for connection, synchronization and entitlement changes; avoid alert floods.
3. Support reduced motion, 200% zoom, and logical text resizing without overlap.
4. Verify both Windows 1366 × 768 and scaled display at 125%, 150%, 200%.
5. No fictional service uptime/reviews, fake connected status or fake purchase confirmation.
6. Profile conflict behavior must be exercised with actual divergent version IDs and concurrent edits in automated acceptance tests once implemented.
7. Confirmation and audit logs required for administrative entitlement changes.
8. All desktop downloads/updates must be signature-verified and have rollback/error paths.
9. Hardware functions limited to documented permitted interfaces with user consent; no protected memory extraction or evasion features.
10. Design sign-off requires visual comparison against PNG IDs and explicit corrections list.

## 11. Repository and handoff boundaries

**Prepared now:** final design PNGs, cross-screen design board and this specification.  
**Still not built:** source applications, databases, API, checkout, signed binary, real device adapters, tests, deployments.  
**Proposed next implementation gate:** approve exact v1 product/device use case, data model and payment provider eligibility; create architecture decision records; scaffold monorepo; build the shared tokens/components and mocked screens; add tests; then connect real services in reviewable milestones.

For traceability, retain v1 HIFI-01 through HIFI-05 and v2 HIFI-06 through HIFI-11. Distinguish visual **design approval** from **technical compatibility verification** and **production readiness**.