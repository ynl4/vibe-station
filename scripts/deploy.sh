#!/usr/bin/env bash
# Vibe Station — One-command Deploy
# Usage: ./scripts/deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE="vibe-station"
CONTAINER="vibe-station"
PORT="${PORT:-3000}"

# ── Load .env if present ─────────────────────────────────────
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_DIR/.env"
  set +a
fi

echo "=== Vibe Station Deploy ==="
echo "Project: $PROJECT_DIR"
echo "Image:   $IMAGE"
echo "Port:    $PORT"

# ── Build ────────────────────────────────────────────────────
echo ""
echo "[1/4] Building Docker image..."
docker build -t "$IMAGE" -f "$SCRIPT_DIR/Dockerfile" "$PROJECT_DIR"

# ── Stop old container ───────────────────────────────────────
echo ""
echo "[2/4] Stopping old container..."
docker stop "$CONTAINER" 2>/dev/null || true
docker rm "$CONTAINER" 2>/dev/null || true

# ── Start new container ──────────────────────────────────────
echo ""
echo "[3/4] Starting new container..."
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p "$PORT:3000" \
  --volume "$PROJECT_DIR/data:/app/data" \
  ${DEEPSEEK_API_KEY:+--env DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY"} \
  ${ACCESS_TOKEN:+--env ACCESS_TOKEN="$ACCESS_TOKEN"} \
  ${GITHUB_USERNAME:+--env GITHUB_USERNAME="$GITHUB_USERNAME"} \
  "$IMAGE"

# ── Verify ───────────────────────────────────────────────────
echo ""
echo "[4/4] Verifying..."
sleep 3
if docker ps --filter "name=$CONTAINER" --format '{{.Names}}' | grep -q "$CONTAINER"; then
  echo "✅ Container is running!"
  echo ""
  echo "    Logs:  docker logs -f $CONTAINER"
  echo "    Stop:  docker stop $CONTAINER"
  echo "    URL:   http://localhost:$PORT"
else
  echo "❌ Container failed to start. Logs:"
  docker logs "$CONTAINER" 2>/dev/null || true
  exit 1
fi
