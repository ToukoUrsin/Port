#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
GO_BIN="${GO_BIN:-/usr/local/go/bin/go}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
  echo -e "${GREEN}Done.${NC}"
}
trap cleanup EXIT INT TERM

# --- Docker: Postgres + Redis ---
echo -e "${YELLOW}Starting infrastructure...${NC}"

if ! docker ps --format '{{.Names}}' | grep -q '^localnews-postgres$'; then
  if docker ps -a --format '{{.Names}}' | grep -q '^localnews-postgres$'; then
    docker start localnews-postgres >/dev/null
  else
    docker run -d --name localnews-postgres \
      -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=localnews \
      -p 5432:5432 pgvector/pgvector:pg16 >/dev/null
  fi
  echo -e "  PostgreSQL: ${GREEN}started${NC}"
else
  echo -e "  PostgreSQL: ${GREEN}already running${NC}"
fi

if ! docker ps --format '{{.Names}}' | grep -q '^localnews-redis$'; then
  if docker ps -a --format '{{.Names}}' | grep -q '^localnews-redis$'; then
    docker start localnews-redis >/dev/null
  else
    docker run -d --name localnews-redis -p 6379:6379 redis:7-alpine >/dev/null
  fi
  echo -e "  Redis:      ${GREEN}started${NC}"
else
  echo -e "  Redis:      ${GREEN}already running${NC}"
fi

# Wait for Postgres
echo -ne "  Waiting for Postgres..."
for i in $(seq 1 30); do
  if docker exec localnews-postgres pg_isready -U user -d localnews -q 2>/dev/null; then
    echo -e " ${GREEN}ready${NC}"
    break
  fi
  [ "$i" -eq 30 ] && echo -e " ${RED}timeout${NC}" && exit 1
  sleep 1
done

# --- Backend .env ---
if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  sed -i 's|change-me-to-a-random-32-byte-string-base64|dev-secret-key-change-in-production-1234|' "$ROOT/backend/.env"
  sed -i 's|postgresql://user:pass@localhost:5432/localnews|postgresql://user:pass@localhost:5432/localnews?sslmode=disable|' "$ROOT/backend/.env"
  echo -e "  Created ${GREEN}backend/.env${NC} from example"
fi

# --- Frontend deps ---
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo -e "${YELLOW}Installing frontend dependencies...${NC}"
  (cd "$ROOT/frontend" && npm install --silent)
fi

# --- Start backend ---
echo -e "\n${YELLOW}Starting backend on :8000...${NC}"
(cd "$ROOT/backend" && CGO_ENABLED=0 "$GO_BIN" run cmd/server/main.go) &
BACKEND_PID=$!

# --- Start frontend ---
echo -e "${YELLOW}Starting frontend on :5173...${NC}"
(cd "$ROOT/frontend" && npm run dev -- --clearScreen false) &
FRONTEND_PID=$!

echo -e "\n${GREEN}=== Both servers starting ===${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:8000${NC}"
echo -e "  Press Ctrl+C to stop everything\n"

wait
