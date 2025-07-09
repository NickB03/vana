#!/bin/bash

echo "🚀 Starting VANA UI Integration"
echo "================================"

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up trap to call cleanup on script exit
trap cleanup EXIT INT TERM

# Check if Python 3.13 is available
echo "📋 Checking Python version..."
if ! python3.13 --version &>/dev/null; then
    echo "❌ Python 3.13 is required but not found"
    echo "Please install Python 3.13 or use poetry env use python3.13"
    exit 1
fi

echo "✅ Python 3.13 found"

# Start VANA backend
echo -e "\n🔧 Starting VANA backend on port 8081..."
python3.13 main.py &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if ! curl -s http://localhost:8081/health > /dev/null; then
    echo "❌ Backend failed to start. Check the logs above."
    exit 1
fi

echo "✅ Backend is running!"

# Start frontend
echo -e "\n🎨 Starting VANA UI frontend on port 5173..."
cd vana-ui
npm run dev &
FRONTEND_PID=$!

echo -e "\n✅ VANA UI Integration is running!"
echo "================================"
echo "🔗 Frontend: http://localhost:5173"
echo "🔗 Backend API: http://localhost:8081"
echo "🔗 API Docs: http://localhost:8081/docs"
echo -e "\nPress Ctrl+C to stop all services"

# Wait for processes
wait
