# Xbox QA private intake and triage — Alpha 32

**Security scope:** This is an optional, administrator-only workflow on the **local authenticated DMA Hub API**. The public GitHub Pages site has no access to it. It never tests an Xbox, verifies game builds, certifies devices, creates a software license, or approves downloads.

## Workflow

1. On your actual Xbox/companion PC, use the [Xbox QA field workbook](https://dma.moobee.lol/#/games/call-of-duty/xbox-qa). Select the real Xbox model, Call of Duty edition and build, Xbox OS, test date and observed outcomes. Only mark the physical testing declaration when a real test took place.
2. Export a **JSON v1** field report. Because public GitHub Pages cannot reach private local API services, transfer the report using an approved private workflow to an authorized technician's workstation.
3. Run the local API in private staging, authenticate with an **admin** account, and open **Admin → Xbox QA Intake** at \`/admin/xbox-qa\`.
4. Choose the JSON file. It is parsed and previewed **locally**, not auto-uploaded. Click **Import to private API** and confirm to persist it.
5. The server independently validates the field content, selected model/game, versioned schema, HTTPS evidence format, test-date format, test-declaration flag and at least one observed pass/failure/blocker. Duplicate canonical reports are rejected by a SHA-256 fingerprint. Client-side parsing alone cannot bypass server checks.
6. Administrators may inspect the private full report and append a version-checked **operator-triaged** or **retest-required** event with explanatory notes. Triage is a record-management action, **not independent confirmation** of a console, game's build or feature compatibility.
7. After a new Xbox OS/game patch, create a **new original workbook report**; don't edit the original report. Previous submission payloads and triage events cannot be modified or deleted through the API, protected by SQLite triggers and audit records.

## API contract (schema v18)

| Route | Role | Behavior |
|---|---|---|
| \`GET /v1/admin/xbox-qa\` | Administrator | List at most 200 imported reports, version/state/fingerprint and limited summary; excludes raw private evidence and notes |
| \`POST /v1/admin/xbox-qa\` | Administrator | Accept \`{session:<v1 Xbox QA object>}\` (or v1 object), strict validation and duplicate detection; create immutable submission plus v1 \`submitted\` event |
| \`GET /v1/admin/xbox-qa/:id\` | Administrator | Full private operator-reported session and append-only triage history |
| \`PATCH /v1/admin/xbox-qa/:id\` | Administrator | Require \`If-Match: <current version>\`, \`{state:"triaged"|"retest_required",note:"..."}\` with 10–1000 characters; append a new event; return version conflict on stale request |

Other authenticated roles receive **403**, unauthenticated calls receive **401**. No public QA endpoint reads these tables, and the existing game compatibility/public QA release flows remain completely independent. Backups now verify both new schema tables.

## Data privacy and limitations

- Imported reports may contain internal test notes and HTTPS evidence references. Only an authorized admin can read the full report. Never submit passwords, tokens or unnecessary personal identifiers.
- Submissions are **self-reported**; field exports may be altered before intake. Hashes detect identical duplicate canonical payloads, **not authenticity or device presence**. No Xbox publisher/OS attestation, audit-grade signed evidence chain or independent hardware verification exists.
- A triaged report remains **operator-reported only**; it does not drive product listings, approved compatibility, checkout, licenses or downloads.
- Local browser data is not synchronized automatically. The workstation must access the configured local API over an approved network; private staging is loopback-only.
- Future production milestones include user-approved backend deployment, secure evidence storage/retention, authenticated employee access review, signed proof-of-test workflow and real console QA.

## Code acceptance

Node/API tests cover admin-only access, malformed data rejection, duplicate import, immutable submission/event history, valid version progression, unauthorized customer reads and the absence of public compatibility results. The CI container and backup tests exercise schema v18 migrations. **None substitutes physical console QA.**

## Optional regression comparison (Alpha 33)

After importing at least two genuine field reports for the **same Call of Duty edition and physical console model**, open one in Admin → Xbox QA Intake and use **Compare with another operator report**. The selected report is the baseline; the second is the candidate. The comparison shows changes in each checkbox and highlights an operator-reported pass-to-fail/blocked regression or fail-to-pass improvement, plus distinct build/console OS versions.

The private `GET /v1/admin/xbox-qa/:id/compare?with=:otherId` endpoint requires an administrator. Different games, different Xbox model families/versions, missing IDs or the same report twice are rejected. Only per-check statuses and minimal non-sensitive metadata are returned; private evidence URLs and full notes are not leaked by this endpoint.

Changing the installed game build, changing the Xbox OS version, or reporting a regression triggers **manual retest indicated**. This does not assert any game update actually shipped, validate test data authenticity, confirm accessory compatibility, or approve downloads. All raw reports remain immutable.
