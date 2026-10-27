# Concept 3 — Professional Hybrid
## High-Priority Screen Specifications — Batch 2

**Document type:** UX/UI product specification; no code or implementation authorized  
**Revision:** 1.0 — 2026-10-27  
**Continuation of:** `Concept3_High_Priority_Screen_Specs_Batch1.md`  
**Screens:** AD-01 Admin Overview; AD-02 Users & Licenses; WD-01 Windows Launcher Overview; WD-02 Device Center; CS-01 Configuration Studio Main; CS-02 Categories & Profiles  
**Brand:** Working placeholder, not final. **Design direction:** Approved Concept 3 — Professional Hybrid.

> Design and architecture patterns are original. Competitive references are limited to publicly exposed UX and published feature descriptions. Do not copy proprietary interfaces, source code, protected game integrations, or bypass device/application protections. Supported software and hardware integrations must be authorized and documented.

---

## 0. Cross-application rules and handoff

### 0.1 Shared design tokens — unchanged from Batch 1

| Token | Value | Role |
|---|---|---|
| `bg.canvas` | `#07111D` | App outer canvas |
| `bg.surface` | `#0D1A2A` | Navigation and cards |
| `bg.elevated` | `#142337` | Active controls, drawers |
| `border.default` | `#24364A` | Hairline outlines |
| `accent.primary` | `#19B9CE` | CTAs, selected, focus |
| `accent.hover` | `#3DD8E9` | Hover emphasis |
| `accent.secondary` | `#778BFF` | Expert/optional features |
| `text.primary` | `#F5F9FC` | Key content |
| `text.secondary` | `#A3B5C7` | Supporting copy |
| `state.success` | `#2EC18D` | Verified healthy |
| `state.warning` | `#F3B75E` | Pending/expiring |
| `state.error` | `#F26470` | Failure/revoked |

Space Grotesk display titles; Inter UI labels, forms and tables (subject to font licensing). 4 px spacing system; 10 px input/button radii; 16 px card radii; minimum body 14–16 px, operational tables 13–14 px. Contrast and keyboard focus must remain legible. Moderate cyan accents; violet is secondary. Success/error requires a text label, not color alone. No simulated uptime or financial metrics presented as fact.

### 0.2 Surface anatomy — distinct by purpose

| Surface | Visual identity | Navigation | Main density |
|---|---|---|---|
| Public storefront | Image-led, editorial, clear CTA | Horizontal header | Low–medium |
| Customer portal | Personal task-driven home | 248 px sidebar | Medium |
| **Admin console** | Operational, data-first, audit-aware | 248 px sidebar + compact topbar | Medium–high |
| **Windows launcher** | Utility-first app shell, connection status prominent | 216 px sidebar, native window controls | Medium |
| **Configuration studio** | Inspector/workbench with contextual preview | 208 px category rail + 300 px optional right inspector | High, organized |

**Explicit separation:** The launcher is the place to start/manage installed apps. The studio is the place to edit/apply compatible settings. The admin console manages people/products and must never resemble a consumer configuration page.

### 0.3 Page-wide behavior contracts

- All actions have appropriate idle, hover, focus, pending, success, error and disabled states.
- Destructive, payment-sensitive, entitlement-sensitive and firmware-sensitive actions always require appropriate roles and server-side checks; the UI alone cannot grant access.
- Every destructive edit includes a confirmation summarizing the target and effect. Important administrative changes also produce an immutable audit record.
- Device statuses include **last seen** and are never marked connected based on stale cached data.
- Don't assume installation, launch, update or device connection succeeded without acknowledgement from the local client.
- Read-only/offline access remains possible only for safely cached settings and documentation; no false cloud-sync confirmations.
- Loading skeletons preserve card/table dimensions; empty states explain the next useful action; errors include retry and diagnostic references.
- No production-specific game cheating, protected-memory access, device spoofing or anti-cheat bypass controls are designed in these screens. Generic input settings and opt-in overlays are scoped to authorized apps.

---

# AD-01 — Admin Overview

**Primary route:** `/overview` on staff-only admin origin  
**Audience:** Operations admin, business manager, authorized support lead  
**Purpose:** Understand sales, entitlements, releases, user activity and service incidents; move to the right management workflow in one click.  
**Primary actions:** View Incidents, Open Support Queue, Review Orders (all actual routes must exist before activation).

## AD-01.1 Desktop wireframe

```text
┌ Admin sidebar (248) ┐┌────────────────────────────────────────────────────────────────────┐
│ LOGO / Workspace    ││ Top bar: Environment • Global search • Notifications • Staff menu │
│ Overview ◀          │├────────────────────────────────────────────────────────────────────┤
│ Users & Licenses    ││ ADMIN OVERVIEW                         Date filter [Last 30 days v]│
│ Products / Plans    ││ Workspace service health: Healthy / Degraded / Incident + freshness│
│ Orders & Billing    │├────────────────────────────────────────────────────────────────────┤
│ Releases            ││ KPI: active subscriptions | paid orders | active entitlements    │
│ Support             ││ KPI: open tickets | latest release adoption (optional 5th card) │
│ Devices             │├───────────────────────────────────────┬────────────────────────────┤
│ Analytics           ││ Revenue / Order Trend                 │ Open Incidents & Alerts    │
│ System Status       ││ Filtered chart, real values           │ severity + last update     │
│ Audit Logs          │├───────────────────────────────────────┼────────────────────────────┤
│ Settings            ││ Orders Needing Attention              │ Support Queue Snapshot     │
│                     ││ payment/fulfillment table             │ urgency / assignee        │
│                     │├───────────────────────────────────────┴────────────────────────────┤
│                     ││ Recent Releases / Admin Activity + View Audit Log               │
└─────────────────────┘└────────────────────────────────────────────────────────────────────┘
```

## AD-01.2 Modules

| Block | Data shown | Drilldown/action | Rules |
|---|---|---|---|
| Global status strip | Aggregate service state, observed time | Open System Status | Unknown/degraded must be explicit; never infer healthy |
| Date and scope filters | Last 7/30/90 days, custom range, product filter | Re-query KPI and chart | All KPI cards reflect same filter; current active counts clearly labeled as snapshot metrics |
| KPI cards | Active subscriptions, paid orders, active entitlements, open support | Link to corresponding admin list | Show data provenance/tooltip; no fabricated deltas |
| Revenue/order chart | Money in displayed currency, time buckets; optional orders overlay | Expand Analytics | Refunds/taxes conventions declared |
| Incident panel | severity, affected service, opened time, state | Incident detail | Criticals first; one-click acknowledged transition only for authorized role |
| Orders attention table | transaction reference, customer, amount, state, flagged reason | Order detail drawer | Mask sensitive payment info |
| Support snapshot | priority, age, owner, product, status | Ticket detail | SLA timer only if configured |
| Release/activity rail | latest stable/beta releases, recent admin actions | Releases / Audit Log | Show actor, time and source; protect private data |

## AD-01.3 Interactions

1. Changing date range refetches all historical metrics and chart series; loading state shown in place. A snapshot count (e.g., currently active licenses) remains labeled **Current**, so users do not mistake it for period data.
2. Clicking a KPI filters and opens its management page; back navigation retains the last filter/date choice.
3. On alert panel, a staff user can open incident details. Acknowledge/resolve actions require permission and an audit record; low-privilege roles see read-only.
4. Global search scopes to customers, orders, products, licenses and releases only for data the actor can access. Suggestions display type + safe identifier.
5. Staff can customize card visibility later (P1). Do not build arbitrary dashboard editing in MVP.

## AD-01.4 Data display contracts

- `snapshot_at` / `last_updated_at` visible on service cards and optionally in KPI tooltips.
- Metric value shown only with real authorized source; show `—` / "Data unavailable" if missing, not zero.
- Every currency amount has ISO currency code, with chart labels aligned to the reporting convention.
- Chart time zone and reporting interval displayed. Percentage deltas shown only if matching comparison periods exist.
- Access failures do not leak other tenants' customer records.

## AD-01.5 States, breakpoints, acceptance

- **No paid orders yet:** Show clear empty revenue panel and setup task; preserve other operational metrics.
- **Partial API outage:** Individual widgets explain unavailable dependencies without taking down entire page.
- **Critical incident:** Status strip changes to actionable warning, without hiding normal operational workflow.
- **1440+:** KPI 4 across; chart 8/12; incidents 4/12; tables two columns. **1024:** chart full width, stacked tables. **768:** side nav drawer; one main table per row. **Mobile:** supported read-only basics, sensitive mutations desktop/tablet optimized.
- **Acceptance:** Accessible chart/table alternative; filters coherent; correct permissions; no fake metrics; drilldowns exist; status freshness shown; keyboard navigation works.

---

# AD-02 — Users & Licenses

**Primary route:** `/users` with license workspace at `/licenses`; user details via `/users/:id`  
**Audience:** Staff with explicitly scoped CustomerRead, CustomerManage, EntitlementManage, AuditRead permissions  
**Purpose:** Locate a customer, understand access, correct legitimate account issues, and audit every sensitive intervention.

## AD-02.1 Desktop wireframe

```text
┌ LEFT ADMIN NAV ┐┌──────────────────────────────────────────────────────────────────────┐
│ Users ◀       ││ USERS & LICENSES                  [Invite] [Export authorized scope]  │
│ Licenses      ││ Search email / customer ID [________]  Filters [Status] [Role]      │
│               │├──────────────────────────────────────────────────────────────────────┤
│               ││ Users table                                                           │
│               ││ Name | Email (masked by role) | Role | Products | Access | Last seen │
│               ││ ------- select a row ------------------------------------------  >  │
│               │├────────────────────────────────────┬─────────────────────────────────┤
│               ││ MAIN CUSTOMER DETAIL               │ Context side drawer (420 px)    │
│               ││ Summary | Subscriptions | Devices  │ Customer • account health       │
│               ││ Licenses | Support | Audit         │ ACTIVE LICENSES / timestamps    │
│               ││ License list / entitlements        │ Allowed actions and rationale   │
└───────────────┘└────────────────────────────────────┴─────────────────────────────────┘
```

**Distinctiveness:** This is an administrative investigation workspace, not a storefront product grid. Primary content is a high-utility table with a contextual customer inspector and explicit access-history timeline.

## AD-02.2 Users list specification

- Persistent search by email, user ID or public display name; server-side pagination and filters (role, account state, creation date, active access, selected product).
- Columns: account, email (role-permitted), status, role, entitlement count, last login timestamp and row menu. Selection never reveals fields unauthorized for the staff role.
- Responsive row opens full-screen details on tablet/mobile; hover-only action menus are prohibited.
- Default sort: newest activity (clearly labeled); allow creation date and account status. No arbitrary changing of security roles from a row shortcut.
- Bulk operations limited to carefully scoped non-destructive administrative tasks and deferred until audited requirements are approved.

## AD-02.3 Customer details

**Header:** public display name/ID; account state; created date; last-login date (when tracked and consented); link/copy safe reference.  
**Tabs:** Overview, Subscriptions, Licenses, Devices, Support, Audit.  
**Summary:** current entitlement state, applicable device limit, support links, flags/holds with explicit reason.  
**Privacy:** no payment card details, no local file contents, no raw hardware fingerprint in the normal view.

## AD-02.4 License workspace specification

| Property | Display | Notes |
|---|---|---|
| License reference | Truncated identifier + copy action | Full keys never echoed casually |
| Product / plan | Product name, plan tier | Linked to actual product catalog |
| Access state | Pending, Active, Grace, Expired, Suspended, Revoked | Explicit state transitions; avoid 'Active' on stale cache |
| Validity | Start / end UTC internally, localized in UI | Show time zone on date tooltips |
| Activation | Used/allowed device slots | Device details permission-gated |
| Source | Payment/order, staff grant, promo code | Traceable provenance |
| Actions | Extend, suspend, revoke, restore eligible state | Role and business policy enforced; mandatory reason and audit |

**Action flow example — suspend an entitlement:** Open License → select Suspend → modal identifies account/product/license and effect → enter reason → preview changes → confirm with step-up authentication if policy requires → pending state → server confirmation → audit timeline update. If API fails, previous state remains and error explains next action. Refund/payment effects are not silently implied.

**Other sensitive flows:** invite customer, role change, remove device association, grant courtesy license and export customer records each have a separate policy, permission, explicit reason and appropriate approval level.

## AD-02.5 Edge cases and acceptance

- Duplicate names: always disambiguate with customer ID/email.
- Expired and revoked are distinct states; neither is treated as payment failure without evidence.
- Conflicting webhook/order state: display review-needed state, do not double-grant.
- Rate-limit search, log privileged reads when required, and mask PII according to staff permissions.
- **Acceptance:** A support specialist can find a customer, inspect allowed entitlement history, identify an access issue and escalate without access to privileged revocation; privileged actions show their audit trail and cannot complete silently.

---

# WD-01 — Windows Launcher Overview

**Application surface:** Signed Windows desktop app (Tauri/React conceptual shell)  
**Audience:** End user with permitted products and optional connected hardware  
**Purpose:** Answer "am I signed in, is my access valid, what's installed, what needs updating, and what can I open?"  
**Primary CTA:** Open installed entitled software; contextual fallback Install / Update / Troubleshoot.

## WD-01.1 Desktop wireframe (preferred 1366×768)

```text
┌ Native frame / titlebar: BRAND  | Connected to cloud | − □ ×                    ┐
├ Sidebar (216) ────┬───────────────────────────────────────────────────────┤
│ Overview ◀        │ Good evening • Account avatar      Sync: 2 min ago   │
│ Software Library  │                                                       │
│ Configurations    │ [License: Active] [Installed apps: 2] [Device: Ready]│
│ Device Center     │                                                       │
│ Updates           │ YOUR SOFTWARE                                        │
│ Diagnostics       │ ┌───────────────────────┐ ┌───────────────────────┐ │
│ Support           │ │ App A • Installed     │ │ App B • Update needed│ │
│ Settings          │ │ Version / release     │ │ Version / notes      │ │
│                  │ │ [Open] [Configure]    │ │ [Update] [Details]    │ │
│ Profile + status │ └───────────────────────┘ └───────────────────────┘ │
│                  │ Quick Links: [Device test] [Sync profile] [Logs]      │
│                  │ Recent activity / latest release                     │
└──────────────────┴───────────────────────────────────────────────────────┘
```

## WD-01.2 Visual language

- Compact persistent navigation; system status in title bar; no oversized marketing hero.
- Product cards favor version/status/actions over artwork, with optional modest thumbnail (80–100 px).
- Use accent.primary only for the single current primary operation. Device issues appear as actionable warning chips, not flashing red animations.
- Windows scaling targets 100%, 125%, 150%, and 200%; typical minimum content layout 1024×650; define fallback compact mode for smaller screens.

## WD-01.3 Key modules

| Module | Shown | Action |
|---|---|---|
| Session ribbon | Signed-in username, connection state, refresh | Sign in / reconnect with safe browser handoff |
| Entitlement card | Accessible products, expiration/grace message | View account/licensing details |
| Library quick cards | Installed state, local version, latest authorized release | Install, Open, Update, Configure |
| Device widget | Live device state if adapter supports it, last seen, selected device | Open Device Center |
| Profile sync widget | Current profile, synced/pending/conflict/failed, last successful sync | Open Cloud Profiles or resolve |
| Activity panel | Successful installs, config saves, updates | View details or changelog |
| Help rail | Contextual guides and support | Diagnostics and support |

## WD-01.4 Actions and state machine

- **Install:** validate entitlement and compatibility → show package size and publisher → download signed artifact → verify signature/hash → installer executes with OS prompts → await installed-app detection → show Installed. Never mark Installed when only a download succeeded.
- **Open:** validate installed executable and allowed state → OS launch → check acknowledgement or process observation permitted by OS → show Opened or actionable failure.
- **Update:** show current/target version and release notes → download + verify → install with restart warning if needed → validation/rollback path.
- **Configure:** open Studio for product and selected profile; on first use show onboarding or Create Profile.
- **Cloud outage:** cached read-only metadata shown with timestamp; no success toast for pending sync; renewal/security policy handled server-side when connection returns.
- **Invalid license:** prohibit relevant launch/download actions and display reason and available remediation; don't delete local user configuration.

## WD-01.5 First-run wizard

1. Welcome and privacy summary; explicit analytics consent choice.
2. Secure sign-in in the system browser; return via verified deep link.
3. Access/entitlement result; meaningful empty state when none.
4. Prerequisite check: Windows version, available disk space, required runtime, network and any optional device adapter.
5. Select entitled product; install or open; guided configuration and device pairing only if needed.

## WD-01.6 Acceptance

- A newly signed-in user can understand software access within 10 seconds without reading docs.
- A device-disconnected, offline or update-required state never has contradictory badges elsewhere in the app.
- All file operations show meaningful progress, cancellation when safe, checksum verification and recoverable failure paths.
- Close, minimize and notification behaviors follow Windows conventions, with no forced auto-start without user choice.
- Accessibility includes keyboard-first operation, scaling and screen-reader labels for all status controls.

---

# WD-02 — Device Center

**Route within desktop shell:** `/devices`  
**Audience:** User with supported, consented devices, support technician assisting them  
**Purpose:** Discover documented hardware, connect or pair where supported, confirm actual capabilities and diagnose problems safely.  
**Primary CTA:** Scan for Devices; then Test Connection / View Diagnostics.

## WD-02.1 Wireframe

```text
┌── Device Center ───────────────────────────────────────────────────────────────┐
│ "Detect, configure and check supported devices"        [Scan for Devices]   │
│ Filters: All / USB / Serial / HID / Network / Simulator                     │
├── Left / main area ─────────────────────┬── Device inspector (340 px) ────────┤
│ [DEVICE CARD A]                         │ Selected: Device A                  │
│ Vendor / model / adapter                │ Connection: Ready (just checked)   │
│ USB • Connected • driver compatible     │ Vendor / model / safe IDs          │
│ [Inspect] [Test]                        │ Firmware version if available      │
│                                        │ Capabilities (supported APIs only) │
│ [DEVICE CARD B]                         │ [Test] [Reconnect] [Docs]          │
│ Network • Offline (seen 3 hours ago)    │ Latest self-test results           │
│ [Inspect] [Troubleshoot]                │ Consent-scoped diagnostics export  │
├─────────────────────────────────────────┴────────────────────────────────────┤
│ Scan results timeline / driver guidance / simulation mode watermark         │
└──────────────────────────────────────────────────────────────────────────────┘
```

## WD-02.2 Device states

`Not detected` → `Detected` → `Driver missing` OR `Permission required` OR `Ready` → `Testing` → `Ready/Failed` → `Disconnected`.

*Paired* and *physically connected* are distinct facts. The interface must not conflate an associated cloud record with an active local hardware connection. If firmware information or capabilities cannot be read, display **Not reported**.

## WD-02.3 Device cards and inspector

| UI element | Data / behavior | Safety and accuracy |
|---|---|---|
| Device identity | Vendor, model, adapter name, safe truncated identifier | Don't expose raw device secrets, MAC/IP in support exports by default |
| Connection method | USB, HID, Serial, Network, Simulated | State source labeled local vs remote |
| State label | Ready, Needs Driver, Not Detected, Testing, Offline, Error | Last checked timestamp shown |
| Capabilities | Documented supported features and adapter version | Capability detection, no arbitrary firmware assumptions |
| Connection test | Clearly bounded functional self-test | No uncontrolled device commands; cancel/timeouts |
| Pair/unpair | Link authorized device to customer account | Confirm removal and explain impact |
| Logs | Local events with timestamp, redacted before sharing | Opt-in export and retention |
| Help links | Device-specific guide and known issues | No blanket support claim for untested hardware |

## WD-02.4 Adapter boundaries and recommended v1 hardware scope

- Plug-in design for one documented reference device or the user's simulator to validate discovery and lifecycle without modifying protected third-party software.
- Future adapter families: USB HID for permitted input devices, serial endpoints, and authenticated LAN devices. Vendor/model certification only after real-device verification.
- Distinguish virtual/simulated device visibly with a persistent SIMULATOR label; never present mock telemetry as real hardware.
- No covert device impersonation, secret firmware dumping, bypass of protected firmware, or unauthorized input automation.

## WD-02.5 Troubleshooting experience

Guide users through: **Detect** → **Confirm driver/permissions** → **Connect** → **Self-test** → **Document results**. Each step has a single visible conclusion (pass, warning, failed, unknown), a human-readable reason and next action. User can copy a support report with sensitive fields redacted; no automatic upload without consent.

## WD-02.6 Responsive and acceptance

- At 1440+, inspector stays visible in right column. At 1024/1366, cards and inspector fit, with collapsible rail. At 768, inspector becomes a slide-over drawer; do not bury the Scan control.
- Stale results visibly expire; rescans replace old state only after success.
- Reconnect/test buttons remain disabled when unsupported by current adapter; provide explanation.
- Device actions are serialized when simultaneous operations would cause contention.
- A support technician can distinguish "not physically connected," "connected but unusable," and "no entitlement" without guessing.

---

# CS-01 — Configuration Studio Main

**Application surface:** Windows Studio linked to an installed, supported application  
**Audience:** User adjusting authorized application/device settings  
**Purpose:** Select a product and profile, change a few controls safely, preview effects using synthetic or user-authorized data, validate and apply settings.  
**Primary CTA:** Apply Changes; secondary Save Draft, Restore, Sync.

## CS-01.1 Differentiated three-pane workbench

```text
┌ Top: Product [v] • Profile [v] • Modified ● • Cloud Sync State • [Apply]  ───┐
├ Left rail (208) ┬───────────────────────────────┬ Inspector/preview (300) ─────────┤
│ Search settings│ CATEGORY: GENERAL             │ LIVE PREVIEW (approved data)       │
│ General ◀      │ Description and learn more    │ Product preview or safe simulator  │
│ Controls       │ ┌ Setting group A ──────────┐ │ Selected control explanation     │
│ Visuals        │ │ Label, help, toggle        │ │ Expected value / compatibility   │
│ Profiles       │ │ Label, unit, slider        │ │ Warnings / dependency notices    │
│ Device         │ └────────────────────────────┘ │                                      │
│ Performance    │ ┌ Setting group B ──────────┐ │ Profile validation summary        │
│ Advanced       │ │ Dropdown, numeric, keybind│ │ Errors 0 • Warnings 1 (example)   │
│ Diagnostics    │ └────────────────────────────┘ │ [View detailed results]           │
├────────────────┴───────────────────────────────┴──────────────────────────────┤
│ Footer: 3 unsaved changes • [Revert] [Save Draft] [Validate] [Apply Changes]│
└──────────────────────────────────────────────────────────────────────────────┘
```

## CS-01.2 Design and content

- Studio has a compact workbench header, persistent category rail and contextual inspector. It must look different from the launcher and admin UI.
- Product/profile selectors are always visible. Switching product/profile with unsaved work presents Save Draft / Discard / Cancel.
- Settings are grouped under clear headings with one-line descriptions and expandable help. Search is by label, tag and description.
- Controls are **schema-driven** with typed values, valid ranges, units, prerequisites, permissions and product version compatibility.
- The preview panel reflects only sanctioned local data or a simulated example; previews should be labeled as illustrative when they do not represent a live product.
- A category may show no configurable settings if the product doesn't support it; hide/disable as appropriate with explanation.

## CS-01.3 Canonical control patterns

| Type | Pattern | Validation |
|---|---|---|
| Toggle | Clear name, description, on/off | dependency availability |
| Slider | Label + numeric input + unit + reset | min/max, step and precision enforced |
| Dropdown | Current selected value + accessible menu | permitted enum only |
| Keyboard shortcut | Capture button, show existing assignment | detect duplicates/reserved keys |
| Color | Swatch + hex/RGBA edit + contrast preview | valid representation and alpha support |
| Numeric field | Range shown, increment/decrement | reject invalid/non-finite value |
| Select device | Supported devices + status | requires compatible adapter |
| Notice/action | Warning text with action link | never use color alone |

## CS-01.4 Data and persistence states

**Edit lifecycle:** `Synced` → `Locally edited` → `Draft saved` → `Validating` → `Ready to apply` → `Applying` → `Applied locally` → `Sync pending` → `Synced`; possible branch `Conflict` or `Error`.

- **Save Draft** writes a recoverable local draft without claiming it is applied.
- **Validate** checks schema, references, permissions, dependencies, incompatible values and version constraints; inline messages identify each failing control.
- **Apply Changes** requires an installed compatible app/adapter when settings target one; show confirmation for changes that require restart or temporarily interrupt service.
- **Cloud Sync** uploads a new profile revision only after local persist; use explicit revision/etag conflict detection rather than blind overwrite.
- **Offline:** allow local drafts for eligible settings, queue cloud sync, and explain limits. Avoid accepting secret credentials into import files or logs.
- **Reset:** selected control/category/profile options are distinct and must confirm scope.

## CS-01.5 Preview and safety

- Preview examples must be identifiable as mock/test displays; if integration uses real user content, show consent and provenance.
- An overlay preview is not an authorization to collect protected memory or render information not provided by an authorized application/API.
- Unsupported integration controls are not displayed as working toggles; use "Not available for this product" with reason.

## CS-01.6 Acceptance

- User can find any supported option through search and navigate entirely by keyboard.
- Unsaved work never disappears silently on product switch, close, update or loss of network.
- Applying invalid settings is blocked with explanations and a focusable error summary.
- Preview, saved draft, applied local state and synced cloud revision are visibly distinguishable.
- Small window mode collapses right inspector into a tab; main controls remain accessible at 1024×650 and 125% scaling.

---

# CS-02 — Categories & Profile Manager

**Studio routes:** `/studio/:product/category/:category`, `/studio/:product/profiles`  
**Purpose:** Detailed feature grouping and lifecycle for named local/cloud profiles, including sharing where authorized.  
**Primary actions:** Create, Duplicate, Rename, Select, Compare, Restore, Export, Import and Sync.

## CS-02.1 Category system

| Category | First-party scope | Main controls |
|---|---|---|
| General | App language, UI preferences, notifications | Theme, language, startup behavior |
| Controls & Bindings | Authorized shortcuts and commands | Hotkey capture, conflict resolver, input modes |
| Visuals | Themes, typography, approved overlay/data display | Color, scale, layout, opacity, preview |
| Profiles | User-defined configuration sets | Create, version, select, compare |
| Devices | Documented adapter integration | Select device, refresh capability, connection settings |
| Performance | App-appropriate resource/preferences | Refresh interval, logging level, resource limits |
| Advanced | Expert schema-supported settings | Warning-protected advanced fields |
| Diagnostics | Validate local app + current profile | Test results, missing dependencies, log export |

A category is shown only where supported by the selected application; category visibility is driven by versioned product schema and customer entitlements, not by static placeholder UI.

## CS-02.2 Profile manager wireframe

```text
┌ Profiles for [Selected Product]                                  [+ New Profile] ┐
│ Search [____________]  Type [All/Local/Cloud]  Sort [Updated v]                │
├───────────────────────────────────────────────────────────────────────────────┤
│ PROFILE LIST (left 45%)                │ PROFILE DETAIL (right 55%)          │
│ ● Default • Synced • v7                │ Name, owner, product, schema       │
│   Competitive Setup • Local only       │ Tags / Last modified / Sync state  │
│   Accessibility • Cloud conflict ⚠     │ Compatibility + validation result  │
│                                       │ [Select] [Duplicate] [Export]      │
│                                       │ Timeline of revision history        │
│                                       │ [Compare revisions] [Restore]       │
├───────────────────────────────────────────────────────────────────────────────┤
│ Storage and privacy note: what syncs to cloud / what remains on device        │
└───────────────────────────────────────────────────────────────────────────────┘
```

## CS-02.3 Profile semantics

- **Draft:** local, unsaved or not applied. **Saved local:** stored on current device. **Synced:** server confirmed matching revision. **Conflict:** local/base differs from remote revision. **Archived:** kept but not default.
- Every profile stores owner, product association, schema version, title, tags, creation and last-modified timestamps, local revision, remote revision, compatibility and validation status.
- `Select` means select current profile; `Apply` means update target app/device. These are not interchangeable.
- Duplicate creates new ID; Rename retains identity/history; Restore generates new revision from an old snapshot and requires confirmation; Export is a portable, versioned file (without secrets).
- Cloud sharing is off by default and deferred until permissions and privacy model are approved. Public profile marketplace is not MVP.

## CS-02.4 Sync conflict resolution

**Conflict drawer:** compare `Current device version` vs `Cloud version`; show timestamp, editor/endpoint and per-setting differences where possible. Offer:

1. **Keep local** → publish as a new cloud revision after explicit confirmation and authorization.
2. **Use cloud** → download remote, keeping recoverable local snapshot.
3. **Save both** → duplicate local under a new name and adopt cloud as selected version.

Never silently overwrite the user's local profile or claim both revisions are identical. If merge is introduced later, present diff/validation and preserve an undo snapshot.

## CS-02.5 Import/export and schema changes

- Imports pass file schema validation, product compatibility, size/field limits and safe parsing; display a summary of changed settings **before** applying.
- For new schema versions, show migration preview, incompatible/removed settings and a backup option; allow user to decline and retain local saved copy where supported.
- Export includes schema/version metadata and user settings only; excludes tokens, passwords and privileged device secrets.
- Profiles from unrelated products cannot be applied just because setting labels happen to match.

## CS-02.6 Acceptance

- New user can create, rename, locally save, reopen and apply a compatible profile.
- Cloud conflict test preserves both variants until the user explicitly resolves it.
- Restoring a historical revision never erases revision history.
- Unsupported imported settings are called out in clear language; no partial hidden apply.
- Empty state prompts "Create a profile" and offers optional documented sample templates (explicitly labeled examples).

---

# 7. Cross-screen workflows and ownership

## 7.1 Order → entitlement → installation → configuration

1. Staff publishes a product and approved compatible release (Admin).
2. Customer purchases or receives legitimate access (Storefront/Customer).
3. Back-end confirms entitlement via authoritative records (not front-end badges).
4. Customer sees entitlement and installed-state truth separately (My Software).
5. Desktop validates compatibility, downloads signed app and confirms installation (Launcher).
6. Customer optionally pairs supported hardware and tests it (Device Center).
7. Studio validates, applies and then syncs a configuration (Studio).
8. Support or staff can inspect only authorized records and a complete audit trail (Admin).

## 7.2 Operational failure → support → resolution

A failed download, expired license, device disconnect or profile conflict generates a local actionable error with a safe diagnostic code. User follows guided troubleshooting or opts into sharing a redacted report. Staff can investigate scoped status, correct eligible entitlements and document the action. The desktop UI verifies recovery before saying the problem is resolved.

## 7.3 Roles and security ownership

| Role | Typical permission | Critical restriction |
|---|---|---|
| Customer | Own products, devices, profiles, invoices | Never access other customers' resources |
| Support agent | Search assigned customers and inspect limited records | Can't arbitrarily grant/revoke access |
| Billing operator | Review orders, eligible refunds | Doesn't obtain application/device secrets |
| License admin | Scoped entitlement adjustments | Reason, step-up auth and audit required |
| Release manager | Submit, stage and publish signed releases | Separation of duties/publishing approval where policy requires |
| Super admin | Platform policy and staff rights | Strong MFA, least privilege and auditable changes |

## 7.4 Quality gates before implementation

- [ ] All six screens signed off for information hierarchy and role scopes.
- [ ] Final product/legal use case and supported device/application integrations named.
- [ ] Brand name, logo and original imagery approved.
- [ ] Responsive wireframes checked at 1366×768 and 1440×900; Windows 125%/150% DPI verified at design time.
- [ ] End-to-end screen states mapped: empty, offline, stale, error, permission denied, license expired, device disconnected, sync conflict.
- [ ] Accessibility: WCAG 2.2 AA intent, input/focus, non-color statuses, logical tab order.
- [ ] Architecture source of truth defined for each status and action; no fabricated UI counts/metrics.
- [ ] Admin event/audit and data minimization policy reviewed.
- [ ] Signed updater and installation flow designed with recovery behavior.
- [ ] Security review of sensitive permission and device actions scheduled.

---

# 8. Next design round (not implementation)

**Batch 3 recommended:** SF-03 Hardware Catalog & Compatibility; SF-04 Reseller Directory; CU-03 Profiles & Sync; CU-04 Devices/Downloads; AD-03 Product/Plan Management; AD-04 Release Center; WD-03 Updates & Diagnostics; CS-03 Validation & Preview; shared dialogs/error-state library.

**Decisions before implementation:** exact authorized first product, supported real hardware models, subscription processor eligibility and entitlement policies, final brand name, installer signing and support/telemetry consent policy. Until then, visual prototypes and sample data should be labeled clearly as examples.