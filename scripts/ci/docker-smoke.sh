#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

API_IMAGE="${API_IMAGE:-structura-api:ci}"
WEB_IMAGE="${WEB_IMAGE:-structura-web:ci}"
VIEWER_IMAGE="${VIEWER_IMAGE:-structura-viewer:ci}"

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  docker build -f apps/api/Dockerfile -t "$API_IMAGE" .
  docker build -f apps/web/Dockerfile --target dev -t "$WEB_IMAGE" .
  docker build -f apps/web/Dockerfile --target viewer -t "$VIEWER_IMAGE" .
fi

NET="structura-smoke-net-$$"
PG="structura-smoke-pg-$$"
API="structura-smoke-api-$$"
WEB="structura-smoke-web-$$"
VIEWER="structura-smoke-viewer-$$"

log_containers() {
  for container in "$@"; do
    if docker inspect "$container" &>/dev/null; then
      echo "=== logs: $container ==="
      docker logs "$container" 2>&1 || true
    fi
  done
}

cleanup() {
  status=$?
  if [[ $status -ne 0 ]]; then
    log_containers "$API" "$WEB" "$VIEWER" "$PG"
  fi
  docker rm -f "$API" "$WEB" "$VIEWER" "$PG" 2>/dev/null || true
  docker network rm "$NET" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT

docker network create "$NET"

docker run -d --name "$PG" --network "$NET" \
  -e POSTGRES_DB=structuradb \
  -e POSTGRES_USER=structura \
  -e POSTGRES_PASSWORD=structura-dev-password \
  postgres:16-alpine

for attempt in $(seq 1 30); do
  if docker exec "$PG" pg_isready -U structura -d structuradb &>/dev/null; then
    break
  fi
  if [[ $attempt -eq 30 ]]; then
    echo "postgres did not become ready"
    exit 1
  fi
  sleep 1
done

docker run -d --name "$API" --network "$NET" --network-alias api \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -e PORT=4100 \
  -e DB_HOST="$PG" \
  -e DB_PORT=5432 \
  -e DB_USER=structura \
  -e DB_PASSWORD=structura-dev-password \
  -e DB_NAME=structuradb \
  -e SMTP_HOST=127.0.0.1 \
  -e SMTP_PORT=1025 \
  "$API_IMAGE"

docker run -d --name "$WEB" --network "$NET" --network-alias web \
  -e API_PROXY_TARGET=http://api:4100 \
  "$WEB_IMAGE"

docker run -d --name "$VIEWER" --network "$NET" --network-alias viewer \
  "$VIEWER_IMAGE"

running() {
  docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null | grep -q true
}

wait_http() {
  local url=$1
  local container=$2
  for attempt in $(seq 1 120); do
    if ! running "$container"; then
      echo "container $container exited before $url responded"
      return 1
    fi
    if docker run --rm --network "$NET" "$CURL_IMAGE" -sf "$url" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  echo "timed out waiting for $url"
  return 1
}

wait_http "http://api:4100/health" "$API"
wait_http "http://web:5173/" "$WEB"
wait_http "http://viewer/" "$VIEWER"

echo "docker smoke checks passed"
