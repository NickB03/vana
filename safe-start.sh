#!/bin/bash
set -euo pipefail
# Kills any process on the specified port, then executes the given command.
# Usage: ./safe-start.sh <port> "<command>"

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <port> \"<command>\""
    exit 1
fi

PORT=$1
CMD=$2

# Validate numeric port
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  echo "Error: port must be a number"
  exit 1
fi

# Ensure lsof exists; fallback to fuser if available
if ! command -v lsof >/dev/null 2>&1 && ! command -v fuser >/dev/null 2>&1; then
  echo "Error: requires lsof or fuser"
  exit 1
fi

# Helper to normalize PID lookup across lsof and fuser
list_pids() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -t -iTCP:"$1" -sTCP:LISTEN 2>/dev/null || true
  else
    # fuser outputs "8080/tcp: 1234 5678" - keep only pure numeric PIDs
    fuser -n tcp "$1" 2>/dev/null \
      | awk '{ for (i = 1; i <= NF; i++) if ($i ~ /^[0-9]+$/) print $i }' || true
  fi
}

# Get PIDs listening on the port (avoid established connections)
PIDS=$(list_pids "$PORT")

if [ -n "$PIDS" ]; then
  echo "Processes on port $PORT: $PIDS"
  # Try graceful shutdown first
  kill $PIDS 2>/dev/null || true
  # Wait up to 5s for port to free
  for _ in {1..10}; do
    sleep 0.5
    STILL=$(list_pids "$PORT")
    [ -z "$STILL" ] && break
  done
  # Force kill if still present
  if [ -n "$STILL" ]; then
    echo "Force killing: $STILL"
    kill -9 $STILL 2>/dev/null || true
    sleep 0.5
  fi
else
  echo "No process found on port $PORT."
fi

echo "Starting new server on port $PORT with command: $CMD"
# Use exec to replace the script process with the server process
exec bash -c "$CMD"
