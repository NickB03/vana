#!/bin/bash
# Start all Vana services (Backend, Frontend, ADK)

echo "🚀 Starting Vana Platform Services..."
echo "====================================="
echo ""

# Function to kill existing processes on ports
kill_port() {
    local port=$1
    echo "Checking port $port..."
    lsof -ti :$port | xargs -r kill -9 2>/dev/null || true
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
kill_port 8000
kill_port 8080
kill_port 3000

# Start Backend API (Port 8000)
echo ""
echo "1️⃣  Starting Backend API on port 8000..."
AUTH_REQUIRE_SSE_AUTH=false uv run --env-file .env.local uvicorn app.server:app --reload --port 8000 &
BACKEND_PID=$!
echo "   ✅ Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Start ADK Dev UI (Port 8080)
echo ""
echo "2️⃣  Starting ADK Dev UI on port 8080..."
uv run --env-file .env.local adk web agents/ --port 8080 --allow_origins "http://localhost:3000" &
ADK_PID=$!
echo "   ✅ ADK PID: $ADK_PID"

# Wait for ADK to start
sleep 3

# Start Frontend (Port 3000)
echo ""
echo "3️⃣  Starting Frontend on port 3000..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..
echo "   ✅ Frontend PID: $FRONTEND_PID"

echo ""
echo "========================================="
echo "✨ All services started successfully!"
echo ""
echo "📌 Access Points:"
echo "   - Frontend: http://localhost:3000"
echo "   - ADK Dev UI: http://localhost:8080"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo "========================================="

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID 2>/dev/null
    kill $ADK_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup INT

# Keep script running
while true; do
    sleep 1
done