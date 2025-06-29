#!/bin/bash
"""
Stop Auto Memory Cleanup Service
Stops the running automatic ChromaDB cleanup service
"""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/auto_cleanup.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "🛑 Stopping auto cleanup service (PID: $PID)..."
        kill "$PID"
        
        # Wait for graceful shutdown
        sleep 2
        
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "⚠️ Force killing service..."
            kill -9 "$PID"
        fi
        
        rm "$PID_FILE"
        echo "✅ Auto cleanup service stopped"
    else
        echo "⚠️ Service not running (PID $PID not found)"
        rm "$PID_FILE"
    fi
else
    echo "❌ No PID file found - service may not be running"
    echo "   PID file location: $PID_FILE"
fi