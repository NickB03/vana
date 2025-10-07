#!/bin/bash
# Kills any process on the specified port, then executes the given command.
# Usage: ./safe-start.sh <port> "<command>"

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <port> \"<command>\""
    exit 1
fi

PORT=$1
CMD=$2

# Find the PID of the process using the specified port
PID=$(lsof -t -i:$PORT 2>/dev/null)

if [ -n "$PID" ]; then
  echo "Process $PID is running on port $PORT. Terminating it."
  kill -9 $PID
  # Wait a moment for the OS to release the port
  sleep 1
else
  echo "No process found on port $PORT."
fi

echo "Starting new server on port $PORT with command: $CMD"
# Use exec to replace the script process with the server process
exec bash -c "$CMD"
