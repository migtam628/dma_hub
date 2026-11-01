# DMA Hub v0.2.0-alpha.33

**Private Xbox QA regression comparison across game and console OS builds. No independent console/game certification.**

## Added in Alpha 33

- Admin → Xbox QA Intake can compare any two **previously imported immutable operator-reported** QA files for the **same Call of Duty edition and Xbox model**.
- Private, administrator-only `GET /v1/admin/xbox-qa/:id/compare?with=:otherId` returns per-check status changes, counts of reported pass-to-failure/blocked regressions and failure/blocked-to-pass improvements, and whether the game or Xbox OS build changed.
- Changed build, changed console OS or reported regressions trigger **manual retest indicated**. A checked box is not measured hardware telemetry, a certified compatibility result, proof a patch shipped, or software download approval.
- The UI includes a comparison report picker, readable per-check table and explicit interpretation notes. The comparison endpoint returns no full QA notes, private evidence URLs, publisher credentials or public QA status.
- Unit/API tests cover comparison classification, cross-model/title restrictions, unauthenticated/customer RBAC, missing/same IDs, privacy and fail-closed compatibility/download claims.
- README, API contract, private intake SOP and roadmap updated.

## Current product limitations

Xbox observations remain voluntary, unauthenticated-origin operator reports. **No physical Xbox was used or measured**, and the project has not verified any cheat software, real game build, publisher rights, trusted launch artifact or Xbox app. There is no public production API, live customer login, real payment settlement, licensed gaming module or 24/7 staffed support.

The GitHub Pages website is a static public preview; the API comparison/triage workspace requires administrator access to a separately configured **private local API**.

## Distribution

Release web ZIP and SHA-256 checksum publish through GitHub Actions. An **unsigned** Windows NSIS preview installer and checksum are attached only after the separate Windows packaging workflow passes.

Documentation: [private Xbox QA intake](docs/xbox-qa-private-intake.md), [manual Xbox field QA](docs/xbox-device-qa-workbook.md), [roadmap](docs/project-roadmap.md).
