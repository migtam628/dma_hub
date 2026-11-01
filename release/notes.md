# DMA Hub v0.2.0-alpha.32

**Private Xbox QA evidence intake and operator triage — not game certification, public hosting or software delivery.**

## New in Alpha 32

- **Admin → Xbox QA Intake** now offers a real local-API-connected workflow: manually select a v1 Xbox field-report JSON, validate and preview it in the browser, then explicitly confirm importing into the authenticated private service.
- Local Node API administrator-only `GET /v1/admin/xbox-qa`, `POST /v1/admin/xbox-qa`, `GET /v1/admin/xbox-qa/:id`, and version-bound `PATCH /v1/admin/xbox-qa/:id` routes. Unauthenticated access is rejected; customers cannot view private field evidence.
- SQLite schema v18 adds **immutable operator-reported submission records** and **append-only, versioned triage events** with database triggers, audit history, and strict `If-Match` conflict checks.
- Server validates console model, selected modern Call of Duty edition, exact self-reported build and console OS, test date, field responses, physical-test declaration and HTTPS evidence URL format. Canonical SHA-256 fingerprint rejects exact duplicate files; it is **not** an authenticity or Xbox attestation signature.
- Administrators can mark imported files **operator-triaged** or **retest-required** with context; neither state certifies a test, approves publisher rights, establishes game compatibility or enables software downloads.
- Automated test coverage for schema migration, backup integrity, strict validation, privileged-access boundaries, duplicate imports, immutable history and absence of public QA approval.
- Updated README, API specification, Xbox field SOP, private intake runbook and project roadmap.

## Deployment and limitations

The customer site at [dma.moobee.lol](https://dma.moobee.lol) remains static GitHub Pages. **Xbox QA intake is not deployed to a public backend.** To use the admin intake, connect to the separately configured private local API and authenticate as an administrator.

No physical console QA was conducted by the repository. Reports are operator-supplied and may be inaccurate; no independently verified source, secure external evidence storage, real publisher rights or commercial software download exists. No Xbox game manipulation, DMA game-memory access, unauthorized input automation or anti-cheat circumvention is implemented.

## Distribution

The release workflow publishes a web ZIP and SHA-256 checksum. A separate Windows packaging workflow may attach the **unsigned** NSIS installer and its checksum only when the build completes successfully.

See [private Xbox QA intake SOP](docs/xbox-qa-private-intake.md), [Xbox field workbook](https://dma.moobee.lol/#/games/call-of-duty/xbox-qa), and [roadmap](docs/project-roadmap.md).
