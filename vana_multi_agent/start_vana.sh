#!/bin/bash

# VANA Multi-Agent System Startup Script

echo "🚀 Starting VANA Multi-Agent System..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check environment configuration
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env with your configuration before running again."
    exit 1
fi

# Start the system
echo "🎯 Starting VANA Multi-Agent System..."
echo "📊 Web UI will be available at: http://localhost:8000"
echo "🛑 Press Ctrl+C to stop the system"
echo ""

python main.py
