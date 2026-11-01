# DMA Hub — private API staging deployment

> **Not a production Internet deployment.** This package runs the Node/SQLite API in a container and binds host TCP 8787 to **127.0.0.1 only**. The browser storefront at `https://dma.moobee.lol` remains a static GitHub Pages preview and is **not** wired to this private server.

## Prerequisites

A Linux machine or VPS with Docker Engine, Docker Compose v2, enough storage, reliable backups, access to the GitHub source, and a private authenticated SSH/Tailscale path. Do not forward/publicly expose TCP 8787. No API domain or GoDaddy DNS change is required for private staging.

## Installation

From the cloned repository on the chosen Linux machine:

```bash
cp deployment/staging/staging.env.example deployment/staging/staging.env
chmod 600 deployment/staging/staging.env
# Edit WEB_ORIGIN to exactly match your development frontend origin.
# Keep mail and Stripe production credentials out of the staging environment.

bash deployment/staging/deploy.sh
bash deployment/staging/verify.sh
```

This builds `apps/api/Dockerfile`, starts a single private API container, persists data in a named Docker volume, removes unused Linux capabilities, marks the root filesystem read-only, checks the local service health, and restarts on crashes. It does **not** publish a customer-facing API.

The `staging.env` file is ignored by Git. It is intentionally not automatically created, because origin policy and optional mail settings are operational choices.

### Remote private access (no public port exposure)

From your workstation, connect using an authenticated SSH tunnel:

```bash
ssh -N -L 8787:127.0.0.1:8787 YOUR_LINUX_USER@YOUR_VPS_OR_TAILSCALE_IP
```

Then use a local development UI on `http://localhost:5173` (matching `WEB_ORIGIN`) and its API on `http://localhost:8787`. Keep the browser and SSH tunnel on the same workstation. Do not put tokens or credentials in shell history or share accounts.

### Back up the SQLite database

```bash
bash deployment/staging/backup.sh
```

The script uses the existing SQLite online backup API inside the running container, verifies the snapshot, copies it into `deployment/staging/backups/` as a file with mode 600, and removes the temporary container copy.

**Critical:** The backup is on the same server; it is **not** off-site disaster recovery. Copy backups into properly encrypted/off-host storage with a tested retention/restoration process. Do not publish a backup in Git or on GitHub Pages. Never run `docker compose down -v` against real persistent volumes unless deletion is specifically intended and verified.

### Stop and restart

```bash
docker compose -f deployment/staging/compose.yaml stop
docker compose -f deployment/staging/compose.yaml start
```

Avoid modifying the SQLite file during active API use; take and verify a backup before upgrades. Migrations run at API startup. See [database recovery](../../docs/database-recovery.md).

## Non-goals and production gates

No public API DNS is configured, no Caddy HTTPS proxy is started, and no public registration is enabled by this package. GitHub Pages runs with its existing static build. Production API deployment is deliberately not automated until these are verified:

- Public DNS/domain ownership and user-approved network exposure.
- HTTPS reverse proxy and secure source-aware rate limiting; no direct public Node port.
- Email verification, recovery, sender authentication and secrets storage with a real provider.
- Security review, anti-abuse monitoring, audit retention, privacy policy, incident response and encrypted off-site backup + restore drill.
- A production-grade release pipeline with versioned migrations, rollback and change management.
- Payment processor onboarding and settlement tests, real software publisher rights, independently tested binaries and hardware, legal policy and support staffing.

This alpha provides **one tested private staging deployment path**, not an internet-facing platform. The project must not be called 100% production-ready until the external gates are complete.

## CI

`.github/workflows/staging-compose.yml` validates the Compose file, boots the private API, performs a health check, and removes the disposable CI volume. Passing CI does **not** prove a real VPS, DNS, TLS or backup environment is correctly configured.
