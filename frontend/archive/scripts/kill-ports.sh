#!/bin/bash

# Vana Project Port Conflict Resolver
# This script kills processes running on ports 5173 and 8000

echo "🔍 Checking for processes on ports 5173 and 8000..."

# Check if processes are running on the ports
PROC_5173=$(lsof -ti:5173 2>/dev/null)
PROC_8000=$(lsof -ti:8000 2>/dev/null)

if [ -n "$PROC_5173" ]; then
    echo "⚠️  Found process(es) on port 5173: $PROC_5173"
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    echo "✅ Killed process(es) on port 5173"
else
    echo "✅ Port 5173 is already free"
fi

if [ -n "$PROC_8000" ]; then
    echo "⚠️  Found process(es) on port 8000: $PROC_8000"
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    echo "✅ Killed process(es) on port 8000"
else
    echo "✅ Port 8000 is already free"
fi

echo ""
echo "🔍 Verifying ports are free..."

# Verify ports are now free
if lsof -ti:5173 >/dev/null 2>&1; then
    echo "❌ Port 5173 is still in use"
    exit 1
else
    echo "✅ Port 5173 is free"
fi

if lsof -ti:8000 >/dev/null 2>&1; then
    echo "❌ Port 8000 is still in use"
    exit 1
else
    echo "✅ Port 8000 is free"
fi

echo ""
echo "🎉 All ports are now free and ready for use!"