#!/bin/bash
"""
Start Auto Memory Cleanup Service
Launches the automatic ChromaDB cleanup service as a background daemon
"""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_PYTHON="$PROJECT_DIR/.venv/bin/python"

# Check if poetry environment exists
if [ -f "$PROJECT_DIR/pyproject.toml" ]; then
    echo "🔍 Using Poetry environment..."
    cd "$PROJECT_DIR"
    
    # Start auto cleanup service with Poetry
    poetry run python scripts/auto_memory_cleanup.py \
        --interval 6 \
        --threshold 10 \
        --daemon &
    
    CLEANUP_PID=$!
    echo "🚀 Auto cleanup service started with PID: $CLEANUP_PID"
    echo "$CLEANUP_PID" > scripts/auto_cleanup.pid
    
    echo "📋 Service Configuration:"
    echo "   - Cleanup interval: Every 6 hours"
    echo "   - Duplicate threshold: 10 chunks"
    echo "   - Log file: auto_cleanup.log"
    echo "   - PID file: scripts/auto_cleanup.pid"
    echo ""
    echo "🛑 To stop: ./scripts/stop_auto_cleanup.sh"
    
elif [ -f "$VENV_PYTHON" ]; then
    echo "🔍 Using virtual environment..."
    cd "$PROJECT_DIR"
    
    # Start with venv python
    "$VENV_PYTHON" scripts/auto_memory_cleanup.py \
        --interval 6 \
        --threshold 10 \
        --daemon &
    
    CLEANUP_PID=$!
    echo "🚀 Auto cleanup service started with PID: $CLEANUP_PID"
    echo "$CLEANUP_PID" > scripts/auto_cleanup.pid
    
else
    echo "❌ No Python environment found"
    echo "   Please run: poetry install"
    exit 1
fi