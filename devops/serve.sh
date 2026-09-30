#!/usr/bin/env bash
# Start both Workers under cf dev (Vite + @cloudflare/vite-plugin).
# VS Code can attach its debugger to the inspector ports once this script is running.
# Ports are fixed in each workspace's vite.config.js.
#
#   Auth Worker  →  cf dev :8788  |  inspector :9229
#   API Worker   →  cf dev :8787  |  inspector :9230
#
# Usage:  ./devops/serve.sh

set -euo pipefail

# Kill the whole process group: cf spawns Vite, which spawns workerd, and killing only cf orphans them
trap 'echo "Stopping..."; trap - EXIT; kill 0 2>/dev/null; exit' SIGINT SIGTERM EXIT

npm run dev -w workspaces/auth &
npm run dev -w workspaces/api &

wait
