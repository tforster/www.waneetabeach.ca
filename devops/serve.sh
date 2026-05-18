#!/usr/bin/env bash
# Start both Workers under wrangler dev.
# VS Code can attach its debugger to the inspector ports once this script is running.
#
#   Auth Worker  →  wrangler :8788  |  inspector :9229
#   API Worker   →  wrangler :8787  |  inspector :9230
#
# Usage:  ./devops/serve.sh

set -euo pipefail

trap 'echo "Stopping..."; kill $(jobs -p) 2>/dev/null; exit' SIGINT SIGTERM EXIT

npx wrangler dev \
  --config workspaces/auth/wrangler.json \
  --port 8788 \
  --inspector-port 9229 \
  --no-show-interactive-dev-session &

npx wrangler dev \
  --config workspaces/api/wrangler.json \
  --port 8787 \
  --inspector-port 9230 \
  --no-show-interactive-dev-session &

wait
