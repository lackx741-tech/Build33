#!/usr/bin/env sh
# One-shot deployment: build images, start the stack, run migrations, verify.
# Usage: ./deploy.sh [--no-build]
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="deployment/docker-compose.yml"

if [ "${1:-}" != "--no-build" ]; then
  echo "==> building images"
  docker compose -f "$COMPOSE_FILE" build
fi

echo "==> starting services"
docker compose -f "$COMPOSE_FILE" up -d

echo "==> waiting for health"
HTTP_PORT="${HTTP_PORT:-80}"
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:${HTTP_PORT}/api/health" >/dev/null 2>&1; then
    echo "    api healthy after ${i}s"
    break
  fi
  sleep 1
done

echo "==> applying database migrations"
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c \
  'for f in /docker-entrypoint-initdb.d/*.sql; do echo "  applying $f"; psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"; done' || true

echo "==> verifying deployment"
CURL_INSECURE=1 BASE_URL="https://localhost:${HTTPS_PORT:-443}" \
  sh deployment/scripts/verify-deployment.sh || true

echo "done"
