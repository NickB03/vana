#!/bin/bash

# Hook System Startup Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting Self-Healing Hook System..."

# Initialize hooks
if [ -f "$SCRIPT_DIR/hook-config.js" ]; then
    echo "📋 Loading hook configuration..."
    node "$SCRIPT_DIR/hook-config.js" register
    
    echo "📊 Hook system status:"
    node "$SCRIPT_DIR/hook-config.js" status
    
    echo "✅ Self-healing hooks are now active"
else
    echo "❌ Hook configuration not found"
    exit 1
fi
