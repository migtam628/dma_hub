#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/deployment/staging/staging.env"
[[ -f "$ENV_FILE" ]] || { echo "staging.env missing: copy staging.env.example" >&2; exit 2; }
echo "[DMA Hub] Checking private Docker API..."
docker compose -f "$ROOT/deployment/staging/compose.yaml" ps
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:8787/healthz"
printf '\n[DMA Hub] Expected loopback-only staging health check completed.\n'
