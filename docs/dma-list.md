# DMA List — Windows PC Beta Readiness

**Shortcut:** "dma list"  
**Scope:** Windows PC only. Xbox is deferred.  
**Baseline:** November 4, 2026.  
**Source of truth:** Update the status and evidence links as gates are verified. An implementation foundation does not equal beta acceptance.

## Eleven beta gates

| # | Gate | Current baseline | Acceptance evidence required |
|---|---|---|---|
| 1 | GitHub Pages storefront | Foundation present | Live Pages preview confirmed on the released revision |
| 2 | Customer and admin UI foundations | Foundation present | Real beta-critical workflows demonstrated without synthetic data |
| 3 | Local account and profile API | Foundation present | Auth, RBAC, migration and profile lifecycle tests passing |
| 4 | Windows installer build pipeline | Foundation present | Artifact generated, installed, updated and uninstalled on Windows |
| 5 | Fix and verify current CI regression | **Verified on hotfix 8aebb7e; PR #29 merged** | Web/API CI, API Container Smoke, Private API Staging Compose Smoke succeeded on hotfix; verify main branch after merge |
| 6 | End-to-end Windows launcher/API integration | Open | Real Windows login/profile/API workflow with failure handling |
| 7 | Replace beta-critical demo data with real state | Open | No synthetic state in beta-required customer/admin paths |
| 8 | Install, update and uninstall QA | Open | Clean Windows install/upgrade/uninstall evidence and rollback checks |
| 9 | Windows physical-device testing | Open | Supported hardware model and OS build recorded with reproducible QA |
| 10 | Secure beta backend and backup recovery | Open | TLS, authentication/permissions, backup, restore drill and monitoring |
| 11 | Beta acceptance testing and documentation | Open | End-to-end, accessibility, security, recovery tests; beta runbooks and release notes |

## Beta scope decisions

- Closed beta: Windows launcher, real accounts/catalog/profile data, authenticated local API, diagnostics and explicit TEST access workflows. Do not claim paid settlement or production licensing.
- Public beta: secured hosted API, operational visibility, tested installer/updates and wider real-device QA.
- Production v1: verified live commerce/licensing, signed and trusted release distribution, independent security and operational controls. Game-specific software modules are not currently implemented and require their own evidence and authorization gates.
- Xbox is deferred; do not schedule Xbox QA or add it to the current Windows beta critical path.

## Release rule

No beta readiness claim based on passing compilation or static previews alone. Record proof for each gate. Never convert manual TEST finance observations into payment/settlement or entitlement claims.
