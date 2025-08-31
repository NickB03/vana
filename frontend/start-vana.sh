#!/bin/bash

echo "🚀 Starting Vana Chat Frontend v2"
echo "================================"

# Check if backend is running
echo "📡 Checking Vana backend connection..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend is not running!"
    echo "Starting backend in a new terminal..."
    
    # Try to start backend in new terminal (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e 'tell app "Terminal" to do script "cd '$PWD'/../ && python app/server.py"'
        echo "📝 Backend starting in new terminal window..."
        echo "⏳ Waiting 5 seconds for backend to start..."
        sleep 5
    else
        echo "Please start the backend manually:"
        echo "  cd .. && python app/server.py"
        echo ""
        read -p "Press Enter when backend is running..."
    fi
fi

# Use the Vana-specific config
echo ""
echo "🔧 Using Vana configuration..."
if [ -f "next.config.vana.ts" ]; then
    cp next.config.vana.ts next.config.ts
    echo "✅ Applied Vana Next.js config"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Start the development server
echo ""
echo "🎨 Starting Vercel Chat UI with Vana backend..."
echo "================================================"
echo "📍 Frontend URL: http://localhost:3000"
echo "📍 Backend URL:  http://localhost:8000"
echo "📍 Chat Page:    http://localhost:3000/vana"
echo ""

# Set development environment
export NODE_ENV=development
export NEXT_PUBLIC_API_URL=http://localhost:8000
export NEXT_PUBLIC_SSE_URL=http://localhost:8000/agent_network_sse

# Start Next.js dev server
pnpm dev