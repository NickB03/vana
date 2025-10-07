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

# Get PIDs listening on the port (avoid established connections)
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -t -iTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)
else
  PIDS=$(fuser -n tcp "$PORT" 2>/dev/null || true)
fi

if [ -n "$PIDS" ]; then
  echo "Processes on port $PORT: $PIDS"
  # Try graceful shutdown first
  kill $PIDS 2>/dev/null || true
  # Wait up to 5s for port to free
  for i in {1..10}; do
    sleep 0.5
    if command -v lsof >/dev/null 2>&1; then
      STILL=$(lsof -t -iTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)
    else
      STILL=$(fuser -n tcp "$PORT" 2>/dev/null || true)
    fi
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
