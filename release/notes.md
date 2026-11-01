# DMA Hub v0.2.0-alpha.28

**Private API staging deployment, verification and backup package. Not a public production API or actual gaming software distribution.**

## New in alpha.28

- Complete repeatable Docker Compose deployment under `deployment/staging/` for the existing Node 22 + SQLite API; host port is **127.0.0.1:8787** only, with no public network exposure.
- Hardened container defaults: non-root Node user, read-only root filesystem, Linux capability drop, no-new-privileges, read-only health probe, tmpfs, process limit, restart policy and persistent SQLite volume.
- Operators explicitly copy and protect `staging.env`, validate Docker Compose configuration and start the service via the documented deploy script. The environment and database snapshots are ignored by Git.
- Health verification command and SQLite online backup/export script use the existing verified backup utility, with mode-600 host-side snapshots and encrypted off-host storage instructions.
- GitHub Actions **Private API Staging Compose Smoke** checks Docker Compose syntax, builds/starts the API and verifies the local health response, then deletes disposable CI storage. Added Node tests for loopback-only configuration and private backup defaults.
- Updated README, local API docs, security/production gating roadmap and full private staging runbook.

## Deployment limitation

The public `dma.moobee.lol` website remains on static GitHub Pages. There is **no public API domain, HTTPS reverse proxy, email provider, real support staffing, third-party software publisher or payment configuration** in this release. Customer accounts/support tickets are not publicly hosted. Do not expose the local API directly to the Internet.

## Distribution

The GitHub prerelease publishes the web ZIP and checksum; after successful Windows packaging it adds an **unsigned** Windows preview NSIS installer and checksum. A successful test does not mean the installer is signed.

## Remaining blockers for 100% production readiness

- Owner-approved server/network and DNS configuration, TLS reverse proxy, rate limiting, secrets and compliance review.
- Real publisher permission, software artifacts, hardware and game build QA, independent security checks.
- Real merchant account and verified payment settlement, commercial entitlement and refund policies.
- Support email/notification provider, staffed support, backups and restore drills, external monitoring and incident-response plan.

See [private staging runbook](deployment/staging/README.md) and [project roadmap](docs/project-roadmap.md).
