# DMA Hub v0.2.0-alpha.29

**First game pilot: Call of Duty: Warzone PC, official-source readiness and patch-aware QA handling. No game cheat binaries or supported-game claim.**

## New in Alpha 29

- Dedicated source-backed pilot page at `#/games/call-of-duty/pilot`, linked from the Call of Duty catalog detail and Setup Planner.
- Captures self-reported PC game client, installed game build, Windows version, CPU and GPU model, RAM, VRAM, free SSD space, TPM 2.0, Secure Boot, DirectX 12, CPU AVX and broadband status.
- Displays Activision's March 11, 2026 minimum and recommended Warzone PC system requirements, with links to its official TPM/Secure Boot guidance and enforcement policy.
- Read-only, local-browser questionnaire; allows TXT/JSON handoff exports, clipboard copy and print/PDF. No game process scanning, device access, firmware updates, cheating or installation.
- Honest status gating for reported below-minimum requirements and unknowns; a completely filled questionnaire still has `gameCompatibilityVerified:false`, `downloadEnabled:false` and no publisher authorization.
- Activision's announced **November 6, 2026 at 00:00 Eastern** Warzone/MW4 Season 1 integration is a mandatory re-check window. The local API conservatively hides **pre-window Call of Duty public compatibility, QA and matched asset metadata records** once the window starts. New operator reviews may restore reports; previous QA and artifact evidence stay stale. It does **not** assume the announced update actually shipped.
- New tests for numeric minimums, security checks, unknown data, date logic, right-to-use and software/download denials, and synthetic API patch-window hiding/re-review.
- Updated README, game architecture, project roadmap and detailed official-source pilot runbook.

## Critical limitations

- **No actual Windows PC/game build is measured or connected** and no real signed publisher software is supplied. Warzone is the initial selected edition of the broader Call of Duty family; this is not confirmation of the user's exact edition.
- No API-backed independent QA pass, license activation, public API deployment, payment settlement or authenticated customer software download.
- No cheating, exploit, game-memory interaction, anti-cheat bypass, unsupported firmware, or authorized-to-use certification is provided.
- Authenticated support and game QA remain features of the separate, privately staged local API, not automatically public services on static GitHub Pages.

## Distribution

GitHub Pages publishes the static web preview, and the release publishes a web ZIP/checksum. A separate Windows workflow publishes an **unsigned** NSIS preview and checksum only once packaging succeeds.

**References:** [Warzone pilot](docs/call-of-duty-warzone-pilot.md), [roadmap](docs/project-roadmap.md), [Activision PC requirements](https://support.activision.com/warzone-2/articles/pc-system-requirements-for-warzone-2), [Activision enforcement policy](https://support.activision.com/articles/call-of-duty-security-and-enforcement-policy).
