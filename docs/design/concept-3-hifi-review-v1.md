# DMA Hub — Concept 3 | High-Fidelity Design Review v1

Status: **Visual review / not approved for implementation**

## Deliverables

All images are original static desktop-size design mockups, exported at **1600 × 1000 px**. They demonstrate layout, typography, spacing, page hierarchy, state visualizations, and component styling. They are **not functional interfaces** and contain simulated data.

| ID | File | Surface | Main visual objective |
|---|---|---|---|
| HIFI-01 | `01_Storefront_Home.png` | Public storefront | Premium product positioning, clear discovery CTA, ecosystem story |
| HIFI-02 | `02_Customer_Dashboard.png` | Customer portal | At-a-glance license/software/device status and next actions |
| HIFI-03 | `03_Admin_Overview.png` | Business administration | Revenue, activity, releases, and operational health |
| HIFI-04 | `04_Windows_Launcher.png` | Windows application | Local app library, connected hardware, updates, quick actions |
| HIFI-05 | `05_Configuration_Studio.png` | Windows application | Contextual settings, preview, drafts, cloud sync and validation |
| BOARD | `00_Review_Board.png` | Review sheet | All five screens at a glance |

## Shared visual specification

- **Brand working title:** DMA HUB — placeholder until approved.
- **Primary background:** `#050D17` / `#07121E` midnight navy.
- **Panel background:** `#0D1A2A` and `#112237`.
- **Dividers and borders:** `#243447`.
- **Primary accent:** `#25C2D7` cyan; interactive primary actions.
- **Secondary accent:** `#9686FF` violet; specialized modules and profile accents only.
- **Positive:** `#41D7A3`; **Warning:** `#FABF65`.
- **Font:** Inter; strong white headline hierarchy, secondary text slate-blue.
- **Desktop layouts:** sidebar width ~228–241 px; cards 11–15 px radii; content gutters 28–42 px.
- **Button treatment:** cyan filled primary, subdued outline secondary, contextual danger only on destructive actions.
- **Card system:** 1px low-chroma strokes, flat/small gradient panels, no heavy frosted-glass blur.
- **Icons:** Placeholder geometric symbols; replace with a consistent production icon set after approval.

## UX rules to carry into implementation

1. Storefront uses an editorial hero; dashboards remain primarily operational; desktop apps use compact windows and dense control panels. Don't force identical cards on all surfaces.
2. Device status reflects verified local client state, not the last known state without a timestamp.
3. License expiration, failed update, offline, unpaired hardware, and cloud conflict all require dedicated non-success states.
4. Profiles distinguish **editing draft**, **saved locally**, **synced**, and **applied**; no misleading single 'Saved' state.
5. Win launcher to customer portal linking requires explicit verified deep-link handoff. Only signed software is installable/updatable.
6. Admin analytics show the exact data time window, source and filtering. Sample values in mockups are illustrative only.
7. Hardware integrations must use documented OS/device APIs with consent; no protected application-memory access or anti-cheat evasion is specified.
8. Before development: create the product detail, profile conflict, error/empty state, and mobile responsive variants.

## Next design gates

- **Gate D1:** review the 5 baseline high-fidelity screens; collect corrections by screen ID.
- **Gate D2:** design responsive/mobile for storefront and customer web UI and compact Windows size.
- **Gate D3:** complete critical secondary screens: product details, hardware compatibility, user/license drawer, device connection troubleshooting, cloud profile merge conflict, release distribution.
- **Gate D4:** approve usable interaction behavior and accessibility, then produce implementation-ready component/Figma tokens and engineering tickets.

## Scope boundaries

This package contains design assets only. No application code, API, database, installer, live data integration, or deployment is included. Public images and descriptions of third-party products were used as general UX references; these designs do not copy third-party proprietary source code or client interfaces.