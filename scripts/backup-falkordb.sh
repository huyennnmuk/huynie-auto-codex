#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
VOLUME_NAME="${FALKORDB_VOLUME:-auto-codex_falkordb_data}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-}"
BACKUP_IMAGE="${BACKUP_IMAGE:-alpine:3.20}"

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[backup] Error: docker not found"
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "[backup] Error: docker daemon not running"
    exit 1
  fi
}

require_docker

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$BACKUP_DIR/falkordb_data_${STAMP}.tar.gz"

echo "[backup] Volume: $VOLUME_NAME"
echo "[backup] Output: $OUT_FILE"

docker run --rm \
  -v "${VOLUME_NAME}:/data" \
  -v "${BACKUP_DIR}:/backup" \
  "${BACKUP_IMAGE}" sh -c "tar -czf /backup/$(basename "$OUT_FILE") -C /data ."

if [[ -n "$RETENTION_DAYS" ]]; then
  if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
    echo "[backup] Pruning backups older than ${RETENTION_DAYS} days"
    find "$BACKUP_DIR" -name "falkordb_data_*.tar.gz" -mtime +"$RETENTION_DAYS" -print -delete
  else
    echo "[backup] Warning: BACKUP_RETENTION_DAYS is not an integer, skipping prune"
  fi
fi

echo "[backup] Done"
