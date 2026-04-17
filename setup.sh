#!/bin/bash
set -e
echo "=== Beat The Odds Setup ==="

# Backend
echo "→ Installing Python dependencies..."
cd "$(dirname "$0")/backend"
python3 -m pip install -r requirements.txt -q

# Frontend
echo "→ Installing frontend dependencies..."
cd "$(dirname "$0")/frontend"
npm install

echo ""
echo "✓ Setup complete!"
echo ""
echo "Next: edit .env and add your ANTHROPIC_API_KEY, then run ./start.sh"
