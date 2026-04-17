#!/bin/bash
ROOT="$(dirname "$0")"

echo "=== Starting 家庭朋友德州娱乐小助手 ==="

# Backend
cd "$ROOT/backend"
source "$ROOT/.env" 2>/dev/null || true
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
echo "→ Backend started (pid $BACKEND_PID)"

# Frontend
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "→ Frontend started (pid $FRONTEND_PID)"

echo ""
echo "✓ Running at http://localhost:5173"
echo "  Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
