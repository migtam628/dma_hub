# DMA Hub — Competitive Reference Research & Product Gap Audit
**Research date:** November 1, 2026
**Scope:** Publicly accessible marketing/storefront pages. Not authenticated dashboards, private seller infrastructure, code, real hardware tests or verified operational performance.

## Research principles
Reference the **customer workflow and information architecture**, not competitor assets, trademarks, wording, source code, firmware, commercial claims, or methods for evading game anti-cheat systems. The presence of a product, publisher claim, price, or compatibility statement on a competitor site is not evidence DMA Hub offers that capability or that the claim is accurate.

| Reference | Observed public-store patterns | Relevant DMA Hub direction | Source |
|---|---|---|---|
| OverDMA | DMA hardware category shopping, mix-and-match kit/bundle navigation, installation service, setup guide, policies, bilingual support positioning. | Hardware requirements, honest setup planner, configurable inventory, documentation and support links. Not device impersonation/firmware evasion. | https://overdma.com/ ; https://overdma.com/collections/all |
| CamUnlocks | Product collections by game, hardware bundle choices, customer login/register, warranty and setup support presentation, purchase/delivery messaging. | Clear categories, trustworthy account state, order/fulfillment statuses, support handling, and no unsupported automated-delivery claims. | https://camunlocks.com/ |
| Blurred.gg | Game detail pages, term-based subscription selection, linked dashboard, cloud configuration concept, auto-update/support claims, reseller discovery. | Per-game build status, transparent requirements, customer profile management, release and update provenance, support, entitlements only once production verified. | https://blurred.gg/ ; https://blurred.gg/duty |
| SSZ.gg | Site `https://ssz.gg/` returned a retrieval error during this research. | No evidence-backed feature conclusions; revisit only when publicly verifiable. | https://ssz.gg/ |

## Priority decisions (product owned, no external credentials needed)

1. **Guided setup, safety, support clarity:** build a three-step browser-local inventory and readiness planner. It reports missing/unknown items and exports JSON/text/PDF; it **cannot** test hardware or attest game compatibility. This is the Alpha 26 milestone.
2. **Support workflow:** maintainable searchable help articles, support ticket lifecycle, privacy, user access and staff audit. Do not imply 24/7 human support without staff coverage.
3. **Customer account and entitlements:** expose only authenticated, server-backed real data and clearly label demo/sandbox. Live subscription billing awaits approved merchant credentials, legal policy and settlement QA.
4. **Installer/update safety:** never run arbitrary third-party binaries; use transparent official GitHub releases, checksum verification and publisher trust/signing gates. Maintain revocation and rollback.
5. **Product compatibility:** operator-reported test journal already exists in Alpha 25 but no real authorized hardware/game tests have occurred. Per-build/per-platform claims must fail closed without current evidence.
6. **Admin operations:** improve support handling, catalog readiness, change history, product moderation and analytics from real data, not fabricated counters.

## Explicit exclusions
No copied competitor product listings or prices in the local demo as if purchasable. No promises of “undetected,” “ban-proof,” 99.9% uptime, instant paid fulfillment, anti-cheat bypass, firmware masquerading, memory manipulation, or unverified license availability.

## Verified baseline before this sprint
- Alpha 25 Windows unsigned installer, web ZIP and SHA-256 checksum files published.
- Web/API CI, GitHub Pages, Windows build and release workflow passed.
- Existing server-backed infrastructure: accounts, profiles, catalog, operator compatibility and QA records, release metadata, test commerce; static GitHub Pages has **no live backend**.
- No functioning game cheat modules, production checkout, independent game compatibility results or trusted production publisher keys.

## Project status methodology
“100%” is not a fixed number without production acceptance criteria. Keep a release gate list with code coverage, deployability, security, payments, real vendor permission, device QA and support readiness; distinguish implemented features from independently tested integrations.

## Additional implementation milestone — Alpha 27

Implemented a local SQLite-backed authenticated customer support ticket lifecycle (create, list, private thread, replies) and administrator queue with audited state changes. This addresses the **support experience pattern** observed across CamUnlocks, OverDMA and Blurred without copying their interface or promising their advertised support coverage. Public GitHub Pages still cannot submit tickets without a separately hosted authenticated backend.
