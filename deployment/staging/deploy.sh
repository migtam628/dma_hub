#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/deployment/staging/staging.env"
if [[ ! -f "$ENV_FILE" ]]; then
 echo "[DMA Hub] No staging.env found. Copy staging.env.example to staging.env, inspect WEB_ORIGIN, then rerun." >&2
 exit 2
fi
if [[ ! -s "$ENV_FILE" ]]; then echo "Empty staging.env is forbidden" >&2;exit 2;fi
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
 echo "Docker Engine and Docker Compose v2 are required" >&2;exit 2
fi
chmod 600 "$ENV_FILE"
echo "[DMA Hub] Validating private-only staging Compose setup..."
docker compose --env-file "$ENV_FILE" -f "$ROOT/deployment/staging/compose.yaml" config --quiet
echo "[DMA Hub] Building API and starting private loopback service..."
docker compose --env-file "$ENV_FILE" -f "$ROOT/deployment/staging/compose.yaml" up -d --build
echo "Use deployment/staging/verify.sh to check health. API is reachable on host 127.0.0.1:8787 only."
echo "For remote testing, use an authenticated SSH tunnel instead of exposing port 8787."
