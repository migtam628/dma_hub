# DMA Hub — Self-hosted API preview

## Important restrictions

This is a **local and test-environment** deployment, not a verified public production system. The API supports password-based test accounts and versioned profiles, but needs email verification, distributed abuse/rate protection, TLS, security monitoring, backups and migrations before exposing it to the public.

The public GitHub Pages website is **static** and does not connect to this backend. Do not set the browser API URL to `localhost` when the website is hosted at GitHub Pages; that points to the visitor's machine.

## Local Docker smoke test

Requirements: Docker Engine with Docker Compose v2. From the repo root:

```bash
docker compose up --build --wait -d api
curl -f http://127.0.0.1:8787/healthz
docker compose logs -f api
```

Default bind is **127.0.0.1:8787 only** on the Docker host. The Node HTTP server binds to `0.0.0.0` **inside** the container; host access remains loopback-only.

A named `api_data` volume persists SQLite state across container recreation. The container runs as a non-root user, drops Linux capabilities, uses a read-only root FS and temporary memory for `/tmp`.

To stop without deleting the database:

```bash
docker compose down
```

**Destructive:** `docker compose down --volumes` permanently deletes the SQLite state; use only for temporary test data.

## Browser access for local testing

If testing with Vite on the same machine, use the default web origin `http://localhost:5173`. If you use a different frontend host, explicitly set `WEB_ORIGIN` to the exact scheme/host/port in a local environment file before `docker compose up`. The API only allows one origin at a time.

## Production hardening checklist

- [ ] Choose supported public hosting and domain
- [ ] TLS reverse proxy with safe origin configuration
- [x] Replace process-local limiter with persistent, hashed-key SQLite rate-limit buckets
- [ ] Add reverse-proxy/edge and cross-host distributed abuse protection
- [ ] Email ownership validation and account recovery
- [ ] Session management and MFA where required
- [ ] Schema migration and encrypted backups with restore drills
- [ ] Central logs, metrics and service alerts
- [ ] Security testing (including SQL, CORS, IDOR and auth)
- [ ] No secrets in Git, no public container ports, no raw SQLite exposure
- [ ] Separate signed release and trusted-download infrastructure

## CI

The [API Container Smoke workflow](https://github.com/migtam628/dma_hub/actions/workflows/api-container.yml) builds the image, waits for the health check, verifies catalog access, checks host loopback binding, and removes test data.
