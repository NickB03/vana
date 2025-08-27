#!/bin/bash

# Hook System Maintenance Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"
CACHE_DIR="$SCRIPT_DIR/cache"
TMP_DIR="$SCRIPT_DIR/tmp"

echo "🔧 Running Hook System Maintenance..."

# Clean old logs (older than 7 days)
if [ -d "$LOGS_DIR" ]; then
    echo "📋 Cleaning old logs..."
    find "$LOGS_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null
    echo "✅ Logs cleaned"
fi

# Clear cache
if [ -d "$CACHE_DIR" ]; then
    echo "🗑️ Clearing cache..."
    rm -rf "$CACHE_DIR"/*
    echo "✅ Cache cleared"
fi

# Clean temp files
if [ -d "$TMP_DIR" ]; then
    echo "🧹 Cleaning temporary files..."
    rm -rf "$TMP_DIR"/*
    echo "✅ Temporary files cleaned"
fi

# Check hook status
if [ -f "$SCRIPT_DIR/hook-config.js" ]; then
    echo ""
    echo "📊 Hook system status:"
    node "$SCRIPT_DIR/hook-config.js" status
fi

echo ""
echo "✅ Maintenance complete"
