#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Skip during night hours (23:00–07:00)
HOUR=$(date +%H)
if [ "$HOUR" -ge 23 ] || [ "$HOUR" -lt 7 ]; then
    echo "[run-agents] Skipping — night hours ($(date +%H:%M))"
    exit 0
fi

# Load deployment env vars
source "$PROJECT_DIR/deployment/.env"

# Get container IPs (they're on an internal Docker network)
PG_IP=$(docker inspect news-postgres --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)
REDIS_IP=$(docker inspect news-redis --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)

if [ -z "$PG_IP" ] || [ -z "$REDIS_IP" ]; then
    echo "[run-agents] ERROR: Could not resolve container IPs. Are news-postgres and news-redis running?"
    exit 1
fi

cd "$PROJECT_DIR/backend"

export GEMINI_API_KEY="$NEWS_GEMINI_API_KEY"
export JWT_SECRET="$NEWS_JWT_SECRET"
export DATABASE_URL="postgresql://news:${NEWS_POSTGRES_PASSWORD}@${PG_IP}:5432/localnews?sslmode=disable"
export REDIS_URL="redis://:${NEWS_REDIS_PASSWORD}@${REDIS_IP}:6379/0"

exec go run cmd/agents/main.go --base-url=https://news.minir.ai "$@"
