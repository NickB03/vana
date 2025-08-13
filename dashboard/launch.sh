#!/bin/bash

# Vana Dashboard Launcher
echo "🚀 Launching Vana Server Dashboard..."

# Navigate to dashboard directory
cd "$(dirname "$0")"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if psutil is installed
python3 -c "import psutil" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 Installing required dependency: psutil..."
    pip3 install psutil --quiet
fi

# Launch the dashboard
python3 dashboard_server.py