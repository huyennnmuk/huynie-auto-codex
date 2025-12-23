#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VOLUME_NAME="${FALKORDB_VOLUME:-auto-codex_falkordb_data}"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
BACKUP_IMAGE="${BACKUP_IMAGE:-alpine:3.20}"

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[restore] Error: docker not found"
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "[restore] Error: docker daemon not running"
    exit 1
  fi
}

detect_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
    echo "docker-compose"
    return 0
  fi
  return 1
}

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup_tar_gz_path>"
  exit 2
fi

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 2
fi

require_docker
compose_cmd="$(detect_compose_cmd || true)"
if [[ -z "$compose_cmd" ]]; then
  echo "[restore] Error: docker compose/docker-compose not found"
  exit 1
fi

echo "[restore] This will stop services and overwrite volume data."
echo "[restore] Volume: $VOLUME_NAME"
echo "[restore] Backup: $BACKUP_FILE"

if [[ "$compose_cmd" == "docker compose" ]]; then
  docker compose -f "$COMPOSE_FILE" down
else
  docker-compose -f "$COMPOSE_FILE" down
fi

docker run --rm \
  -v "${VOLUME_NAME}:/data" \
  -v "$(cd "$(dirname "$BACKUP_FILE")" && pwd):/backup" \
  "${BACKUP_IMAGE}" sh -c "rm -rf /data/* && tar -xzf /backup/$(basename "$BACKUP_FILE") -C /data"

if [[ "$compose_cmd" == "docker compose" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d
else
  docker-compose -f "$COMPOSE_FILE" up -d
fi

echo "[restore] Done"
