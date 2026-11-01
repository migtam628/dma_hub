#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/deployment/staging/staging.env"
[[ -f "$ENV_FILE" ]] || { echo "staging.env missing" >&2; exit 2; }
command -v docker >/dev/null || { echo "Docker is required" >&2; exit 2; }
CID="$(docker compose --env-file "$ENV_FILE" -f "$ROOT/deployment/staging/compose.yaml" ps -q api)"
[[ -n "$CID" ]] || { echo "Staging API container is not running" >&2; exit 2; }
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$ROOT/deployment/staging/backups/dma-hub-$STAMP.sqlite"
REMOTE="/var/lib/dmahub/dma-hub-snapshot-$STAMP.sqlite"
mkdir -p "$(dirname "$DEST")"
[[ ! -e "$DEST" ]] || { echo "Backup already exists; refusing overwrite" >&2; exit 2; }
cleanup(){
 docker exec "$CID" rm -f "$REMOTE" >/dev/null 2>&1 || true
}
trap cleanup EXIT
echo "[DMA Hub] Creating verified SQLite snapshot (no database shutdown required)..."
docker exec "$CID" node /opt/dma-hub/src/maintenance.mjs backup /var/lib/dmahub/dma-hub.sqlite "$REMOTE"
docker exec "$CID" node /opt/dma-hub/src/maintenance.mjs verify "$REMOTE"
docker cp "$CID:$REMOTE" "$DEST"
chmod 600 "$DEST"
echo "Snapshot copied to $DEST (private local file)."
echo "Copy it to separately encrypted/off-host storage; backups on this server are NOT disaster recovery."
