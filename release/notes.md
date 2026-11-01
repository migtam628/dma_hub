# DMA Hub v0.2.0-alpha.26

**Interactive Setup Planner & reference-backed customer experience improvements. No game software downloads or compatibility certification.**

## New features
- Public, responsive `#/setup` **three-stage guided hardware setup planner** integrated into navigation and the homepage.
- Capture planning game category, exact build (self-reported), primary/secondary Windows environments, hardware model, usage purpose, and six checklist responses.
- Every result explicitly distinguishes confirmed/unknown/missing inventory from independent game compatibility or publisher authorization. All approval and download flags remain false even when all six answers are confirmed.
- Functional local browser persistence with schema-validated plan inputs, clear/reset, JSON/TXT export, clipboard copy and browser Print/PDF. No server calls, devices probed, firmware changes, installer execution or license requests.
- Added reusable planner evaluator and Node regression tests (input sanitization, incomplete setups, complete inventory not implying support, unsupported/unknown OS and export honesty).
- Source-linked market and customer journey audit covering OverDMA, CamUnlocks and Blurred; SSZ was unreachable. No competitor assets, product claims, pricing or proprietary methods copied.
- README, gaming architecture and roadmap updated with current limitations and priorities.

## Deployment
GitHub Pages hosts only a static client preview. Alpha ZIP and checksums publish through the workflow; a separate unsigned Windows NSIS alpha installer and checksum are uploaded after verification.

## Not production-complete
No authenticated public API hosting, real publisher/owner rights, independent game compatibility testing, working game software, anti-cheat bypass, trusted publisher enrollment, live payment settlement, final secure download fulfillment, operator support coverage, or production service reliability assurance.

See [competitive research](docs/competitive-reference-research.md), [setup planner](https://dma.moobee.lol/#/setup) and [roadmap](docs/project-roadmap.md).
