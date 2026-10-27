# Concept 3 — Professional Hybrid
## High-Priority Screen Specifications — Batch 1

**Status:** Design specification, not implementation  
**Revision:** 1.0 — 2026-10-27  
**Screens:** SF-01 Storefront Home, SF-02 Product Detail, CU-01 Customer Dashboard Home, CU-02 My Software  
**Brand name:** Working placeholder only; a final brand has not been selected.  
**Design objective:** A consistent premium dark software-commerce experience, from discovery through entitlement, installation, and everyday use.

---

## 0. Cross-application rules

### 0.1 UI tokens (proposed; subject to visual QA)

| Token | Value | Use |
|---|---|---|
| `bg.canvas` | `#07111D` | Global background |
| `bg.surface` | `#0D1A2A` | Cards, sidebars |
| `bg.elevated` | `#142337` | Selected/elevated panels |
| `border.default` | `#24364A` | Thin dividers, card borders |
| `accent.primary` | `#19B9CE` | Primary CTA, selection, focus |
| `accent.hover` | `#3DD8E9` | Active hover treatment |
| `accent.secondary` | `#778BFF` | Premium/advanced annotation |
| `text.primary` | `#F5F9FC` | Heading and primary body |
| `text.secondary` | `#A3B5C7` | Supporting content |
| `state.success` | `#2EC18D` | Active/healthy (always paired with text/icon) |
| `state.warning` | `#F3B75E` | Pending/expiring |
| `state.error` | `#F26470` | Failure/revoked |

Typography: **Space Grotesk** for display headings; **Inter** for navigation, forms, body, tables and figures. Verify deployed font licensing. Body type 15–16 px, compact operational labels 13–14 px; avoid ultra-small labels in dense layouts.

Grid: desktop public website centered at max 1360 px with 32 px gutters and 12 columns; customer app uses 248 px fixed sidebar + flexible content pane, with a 320 px optional utility rail on wide screens. Spacing unit 4 px, cards 16 px corner radius, input/buttons 10 px corner radius, focus treatment 2 px cyan ring with 2 px offset.

Breakpoints for design verification: 375 px phone, 768 px tablet, 1024 px small laptop, 1440 px desktop, 1920 px large desktop. Mobile layout must never rely on hover, and controls must be keyboard operable. Motion 120–220 ms, with reduced-motion support. All states use words/icons as well as color.

### 0.2 Shared header/navigation

Storefront top navigation: brand, Products, Hardware, How It Works, Docs, Support, Status, Sign In, and primary Explore Products CTA. A cart icon/badge appears only when purchasable offerings and checkout are enabled. Make customer dashboard accessible from authenticated nav. On mobile use a menu sheet; close it on destination change and restore focus correctly.

Customer portal left navigation: Overview, My Software, Configurations, Devices, Downloads, Billing, Support, Account. The active route has a filled cyan-tinted selection and aria-current semantics. On narrow screens replace fixed sidebar with a collapsible drawer and keep action buttons reachable.

### 0.3 Shared interaction rules

- Every action has **idle, hover, focus, disabled, in-progress, success, error** states, where applicable.
- Account-sensitive actions require a signed-in session, permissions, and server-side authorization.
- A subscription badge never substitutes for a backend entitlement check.
- Desktop-client launch buttons require an installed, registered URL-protocol or equivalent OS handshake; if absent, show installation guidance. Never show a false 'launched' status.
- Service/device health and release timestamps are displayed only when returned by their authoritative service. Freshness must be disclosed when old.
- When payment processing is not enabled, use 'Join waitlist' / 'Request access' rather than a fake working checkout.
- Keep the marketplace generic and limited to authorized software/devices, not proprietary code or unauthorized game manipulation.

---

## SF-01 — Public Storefront Home

### Purpose and key user outcomes

In 10 seconds, a first-time visitor should understand (a) what the platform offers, (b) how its cloud + Windows components work, and (c) where to explore compatible software or hardware. Secondary goal: return customers get to their portal with one click.

**Routes:** `/`  
**Primary CTA:** Explore Products  
**Secondary CTA:** See How It Works  
**Personas:** new visitor, prospective buyer, returning customer, support-seeking user.

### Desktop wireframe anatomy

```text
┌─ Utility: Operational status / announcement (optional, dismissible) ──────┐
│ BRAND   Products  Hardware  How It Works  Docs  Support       Sign in  CTA │
├────────────────────────────────────────────────────────────────────────────┤
│ LEFT (5/12)                         │ RIGHT (7/12)                        │
│ Eyebrow: CONNECT YOUR WORKFLOW      │ Composite: actual product UI mockup │
│ Headline (2–3 lines)                │ Windows app + cloud profile pane   │
│ Descriptive paragraph               │ floating device status card        │
│ [Explore Products] [See How It Works]│ (accessible alt text)             │
│ Trust subline: Updates / Support    │                                     │
├────────────────────────────────────────────────────────────────────────────┤
│ Ecosystem capability strip (4 equal cards)                                 │
├────────────────────────────────────────────────────────────────────────────┤
│ Featured Software               [View All]                                 │
│ [Product card] [Product card] [Product card]                                │
├────────────────────────────────────────────────────────────────────────────┤
│ How It Works: Account → Install → Pair → Configure                          │
├────────────────────────────────────────────────────────────────────────────┤
│ Cloud Configurations (image + explainer)                                    │
├────────────────────────────────────────────────────────────────────────────┤
│ Supported Hardware + compatibility guide                                   │
├────────────────────────────────────────────────────────────────────────────┤
│ Recent Releases / Documentation / Support                                  │
├────────────────────────────────────────────────────────────────────────────┤
│ FAQ (five accordion items) / final CTA                                      │
└─ Footer: product links, company, policies, service status ──────────────────┘
```

### Section specification and interaction behavior

| Priority | Section | Required content | Behavior |
|---|---|---|---|
| P0 | Header | Brand, nav, signed-in state, contact/support | Sticky after scroll with opaque background; keyboard accessible |
| P0 | Hero | Original headline, clear product statement, two CTAs, product UI preview | Primary CTA → `/products`; secondary → `/#how-it-works` |
| P0 | Capability strip | Software library, profile sync, device center, signed updates | Each links to details/docs; avoid unverified numerical claims |
| P0 | Featured products | 3 curated offerings with supported platform, category and availability | Whole card → corresponding product; CTA follows same route |
| P0 | How it works | 4 numbered steps | Step links to documentation; no misleading automatic onboarding |
| P1 | Cloud configurations | Explanation, screenshot, key benefits | CTA opens supported configuration docs or sign-in |
| P1 | Hardware ecosystem | Device categories and compatibility scope | Compatibility matrix page rather than blanket support claims |
| P1 | Latest updates | Three recent releases/changelog entries | Only show real published entries; empty fallback = guides |
| P0 | Support + FAQ | Search docs, contact link, 5 expandable answers | Accordion may have multiple open items; correct semantic buttons |
| P0 | Footer | Legal, product, company, status links | Support and policies accessible from every page |

### Product teaser card specification

Square/4:3 brand artwork (licensed/original), category label, product name, 1–2 line summary, support badges, availability ('Available', 'Beta', 'Coming Soon'), a 'View Details' link. Do not show fake star ratings, fake active user counts, or hardcoded uptime claims. If price is enabled, show plan's starting price, currency and billing period.

### Responsive variants

- **1440+ px:** full two-column hero; three featured cards; four-part capability strip.
- **1024 px:** hero left/right becomes balanced; fewer decorative layers; card grid 2–3 columns.
- **768 px:** hero stacks text then visual; features two columns; navigation in menu drawer.
- **375–430 px:** single-column content; CTA buttons full-width or stacked; compact product image; never crop critical explanatory UI text.

### Loading, empty, error

- Featured products loading: skeletons preserve card dimensions; avoid page jump.
- No featured products: display ecosystem capability section plus 'Browse Documentation'.
- Catalog/API unavailable: page still renders cached/static copy; do not imply purchasable inventory is available.
- Artwork fails: brand-neutral placeholder with textual alt.

### Accessibility and performance acceptance

- Hero uses one H1, logical heading sequence and meaningful links.
- No essential information is embedded solely inside screenshots.
- Largest hero media has width/height dimensions and optimized loading; noncritical images lazy-load.
- Keyboard flow visits header, hero CTAs, products, FAQ and footer in logical order.
- No fake commerce or device-health claims.

---

## SF-02 — Product Detail

### Purpose and key user outcomes

Visitor can evaluate one offering, confirm operating-system/hardware compatibility, understand the subscription/entitlement and installation process, then purchase or request access with no misleading functionality claims.

**Route:** `/products/:slug`  
**Primary CTA:** Select Plan / Get Access (only when supported)  
**Secondary CTA:** View Setup Guide.

### Desktop layout

```text
Breadcrumbs: Products / Category / Product
┌─────────────────────────────────┬─────────────────────────────────┐
│ MEDIA (7/12)                    │ PURCHASE / ACCESS (5/12)        │
│ Main gallery with thumbnails    │ Product name + status           │
│ Product UI screenshots/video    │ Short description               │
│                                 │ Compatibility status            │
│                                 │ Plan selector                   │
│                                 │ Price + renewal terms           │
│                                 │ [Get Access] [Setup Guide]      │
└─────────────────────────────────┴─────────────────────────────────┘
Tabs/anchors: Overview | Features | Requirements | Releases | FAQ
Features / explained capabilities
Compatibility matrix by OS/device/software version
Install steps + preview of launcher flow
Release history and support links
Related products, footer
```

### Core modules

1. **Identity:** name, version/release date only if provided, publisher/provider identification and product status.
2. **Gallery:** up to 6 images/video screenshots; zoom and keyboard/lightbox close.
3. **Compatibility panel:** minimum OS version, architecture, local dependencies, documented supported devices, app release compatibility and verified/non-verified status.
4. **Plan picker:** plan name, period, price, renewal, device allowance, included release channel, cancellation terms, taxes presented before confirmation. Plan selection updates checkout summary instantly.
5. **Entitlement state:** signed-out → sign in to buy; eligible with active license → Open My Software; expired → renewal path; unsupported location or policy → unavailable copy.
6. **Capability overview:** 4–8 product-specific feature cards; each capability links to a relevant guide.
7. **Release/change log:** version, date, change summary, advisories and link to full history.
8. **FAQ and support:** installation, device support, cancellation/refunds, updates and troubleshooting.

### Interactions and guardrails

- Changing a plan updates price, duration, renewal disclosure and device allowance; a 'one-time' label is only shown for true one-time products.
- CTA never initiates a charge without an explicit review and confirmed checkout step.
- Ineligible plans and unsupported hardware give explanation and supported alternatives.
- Device-specific capabilities must correspond to a real tested adapter; 'planned' or 'experimental' badges if not validated.
- Preview gallery may show configuration controls, but screenshots cannot substitute for actual functionality.

### Responsive and state rules

- **Desktop:** sticky access panel within its column, not covering footer or cross-page actions.
- **Tablet:** split 6/6 with condensed metadata; on smaller tablet stack media before plan box.
- **Mobile:** plan CTA sticky bottom action only when it doesn't cover content; complete billing terms remain accessible above action.
- **Missing price:** show availability status and request-access CTA, not a `$0` fake price.
- **Discontinued product:** page remains readable, hide purchase CTA, provide retirement notice.
- **Backend failure:** show last known static product description; no live purchase action until eligibility is checked.

### Acceptance criteria

- Can inspect product, compatibility, terms and support before selecting a plan.
- Plan changes consistently update visible terms and checkout payload.
- All entitlement-based states render differently and correctly.
- Support docs can be reached without starting checkout.

---

## CU-01 — Customer Dashboard Home

### Purpose and key user outcomes

Returning users understand license access, installed/available software, device state, updates and support needs at a glance, and can reach the next actionable task with one click.

**Route:** `/app/overview`  
**Primary action:** Open My Software / Resume Setup (based on state)  
**Personas:** active subscriber, new customer, expiring license, disconnected-device user.

### Desktop layout

```text
┌────────────── SIDEBAR (248) ──────────────┬───────────────────────────────────────────────┐
│ Brand / Workspace                        │ Topbar: Overview | search | notices | user │
│ Overview [selected]                      ├───────────────────────────────────────────────┤
│ My Software                              │ Welcome + account entitlement summary       │
│ Configurations                           │ [Subscription] [Products] [Devices] [Updates]│
│ Devices                                  │                                               │
│ Downloads                                │ Your Software   [View All]                  │
│ Billing                                  │ [Product row: state / action]                │
│ Support                                  │ [Product row: state / action]                │
│ Account                                  │                                               │
│                                          │ ┌─────────────────────┬────────────────────┐│
│ System status bottom                     │ │Recent activity      │Device / Sync      ││
│                                          │ │ & release notes     │ quick health      ││
│                                          │ └─────────────────────┴────────────────────┘│
└──────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### Screen content

**Title zone:** personalized but privacy-conscious greeting, last sync date, service incident banner if applicable, one intelligent CTA chosen from `Finish setup`, `View software`, `Renew access`, or `Check device`.

**Summary cards (four):**

- **Entitlement:** active / trial / expiring / expired / suspended; next renewal or expiration (verified backend value).
- **My Software:** total entitled applications; optionally installed count when a client connection is known.
- **Devices:** paired count; online count only when recent signed heartbeat available (not merely registered).
- **Updates:** available signed client/product releases relevant to that user; no speculative update badges.

**Your Software:** maximum three top items; thumbnail, name, entitlement state, version (installed if known), action: `Install`, `Open desktop app`, `Update`, `View details` or `Renew` according to actual condition. Never show 'Launch' as successful from a web button without a client handshake.

**Lower widgets:** recent account activity with date/time and origin; service health based on monitoring API; latest released version(s) with changelog; cloud profile sync timestamp; quick support option. Display no personal machine serial numbers unless user has explicitly elected to see them.

### Behavior and state priority

1. Critical security or payment restriction (clearly worded notice).
2. Setup incomplete (single `Complete Setup` CTA).
3. Device disconnected (only when a recent expected connection existed; offer diagnostics).
4. Important signed update (Update CTA).
5. Normal healthy state (Open My Software CTA).

A banner should never cover more than one primary alert at a time; secondary alerts move to notification center.

### Empty/loading/error cases

- New account with no entitlement: onboarding card, `Explore Products`, link to setup guide; no zero-value chart clutter.
- Entitlement active, client not installed: show `Install Windows App` instead of device count pretending offline.
- Device recently disconnected: `Last seen <timestamp>` and `Troubleshoot`.
- Backend auth expired: reauthentication modal then safe return to intended destination.
- Telemetry unavailable: `Status unavailable`, never `Healthy` by assumption.
- Loading: stable four-card skeletons and list placeholders; no flickering action changes.

### Responsive

At 1440 px, show four metrics in one row and lower two-column panels; at 1024 px, two-by-two cards and stacked lower widgets; below 768 px, drawer navigation, single-column cards, short labels, and first action near screen top.

### Acceptance criteria

- Account/entitlement summary matches backend permissions and status.
- Every actionable state directs to a working destination or explanatory fallback.
- A new user can start onboarding within one click.
- Updates and device status show last checked/source freshness.

---

## CU-02 — My Software

### Purpose and key user outcomes

A customer can identify which applications they are entitled to use, which are installed, what updates exist, and what to do next. This is the main bridge between web SaaS and the Windows client.

**Route:** `/app/software`  
**Primary action:** Contextual per product: `Install`, `Update`, `Open desktop app`, `Renew`, or `View details`.

### Desktop layout

```text
Topbar: My Software | Search | View toggle | Filter [All/Installed/Updates/Expired]
Summary: 3 entitled | 2 installed | 1 update (numbers from service)
┌──────────────────────────────────────────────────────────────────────┐
│ Software item / art │ title + description │ entitlement │ version   │
│                     │ supported OS/device │ last sync   │ [Action]  │
├──────────────────────────────────────────────────────────────────────┤
│ Software item / art │ title + description │ entitlement │ version   │
│                     │ supported OS/device │ last sync   │ [Action]  │
└──────────────────────────────────────────────────────────────────────┘
Right details drawer opened from item:
  Version, changelog, system requirements, device compatibility,
  License validity, Installation steps, Profile shortcuts, Support
```

### Content and controls

- **Search:** by software name/provider/category; debounced client filtering for small lists or server search for large lists.
- **View options:** detailed list (default) and visual grid; accessibility preserved in both.
- **Filter chips:** All, Installed, Updates Available, Active Access, Expired, Archived.
- **Sort:** Recently used (if authorized activity exists), Recently updated, A–Z. Preserve filter state in route query parameters.
- **Item metadata:** owned access, install state, installed/latest version, supported OS, release channel, last check and device compatibility.
- **Details drawer:** screenshots, compatibility requirements, release notes, troubleshooting links, cloud profiles count, account/device license usage.
- **Action decision tree:**
  - No active entitlement → `Get Access` or `Renew`.
  - Entitled but no local client connection → `Install Windows App` or `Open Desktop App` with graceful fallback.
  - Client available, software absent → `Install` only when trusted desktop bridge executes user-approved installation.
  - Installed, update available → `Update` with confirmation, progress and release notes.
  - Installed, up-to-date → `Open desktop app` to select the software.
  - Unsupported OS/device → disabled primary operation + clear requirements and support link.

### Optional row overflow actions

Open setup guide, view changelog, manage license, manage profile, show compatibility details, contact support. Do not permit arbitrary file execution from browser data or unverified release URLs.

### Desktop handshake and browser fallbacks

The dashboard can request `Open Desktop App` only via a well-defined, signed or scoped integration mechanism. If no verified handshake exists: display platform detection, installation guide, copy-safe pairing code or user-initiated registration path. The browser should not assume installation or success from merely opening a custom protocol URL. Show explicit install/update job states returned from the client rather than simulating progress.

### Empty/loading/error and mobile

- No products: tasteful empty state with catalog CTA and explanation of entitlements.
- No matching results: clear filters action.
- Subscription expired: retain visible product history, direct user to billing/renewal.
- Product update fails: `Retry`, `View details`, diagnostic link; last installed version remains shown.
- App disconnected: mark remote control unavailable; configuration browsing still works.
- Mobile: cards rather than wide table, action in each card, explicit 'Windows desktop required' copy where relevant.

### Acceptance criteria

- The customer can distinguish access eligibility from installation state at a glance.
- Browser and desktop connection state never disagree silently.
- Update and install buttons have genuine execution targets and error handling.
- Device compatibility and release info are visible before execution.
- Filters/search work using keyboard and maintain accessible labels.

---

## 5. Cross-screen flows and design review checklist

### Flow A — Visitor to access

`Home → Products → Product Detail → Plan / Request Access → Auth → Checkout (when processor is live) → Entitlement → Dashboard → Windows onboarding`

### Flow B — Returning customer to desktop

`Dashboard → My Software → Product → Open Desktop App / Install → Local client handshake → Device check → Configuration Studio`

### Flow C — Recovery

`Dashboard or My Software → Warning state → Diagnostics / Setup Guide / Support → Recovery feedback → Return to product`

### Nonnegotiable product rules

- Don't copy competitor artwork, logos, code, wording or protected layouts wholesale; the approved reference is directional.
- No misleading subscription/health/availability claims.
- Consent before optional telemetry; explain diagnostics data that is shared.
- Payment and licensing remain server-authoritative.
- Download URLs are signed, short-lived and scoped to authorized release entitlements.
- Device support labels must be grounded in tested compatibility, not placeholder data.
- No anti-cheat bypass or unauthorized software/game-memory integration in this platform specification.

### Outstanding decisions prior to implementation

1. Final brand/logo/domain.
2. Actual first software product and authorized device integration.
3. Commerce/payment processor feasibility and product policy eligibility.
4. Subscription durations, device entitlement/activation rules.
5. Whether browser remote control ships in v1 or v1.1.
6. Approved creative assets and real product screenshots.

### Next design batch (not yet approved)

- AD-01 Admin Overview
- AD-02 Users & Licenses
- WD-01 Windows Launcher Overview
- WD-02 Device Center
- CS-01 Configuration Studio Main
- CS-02 Configuration Category & Profile Management

The next batch will reuse this same token set and require separate visual review before coding.