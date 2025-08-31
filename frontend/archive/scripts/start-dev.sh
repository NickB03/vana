#!/bin/bash

# Development startup script for Vana project
# Starts both backend and frontend services

set -e

echo "🚀 Starting Vana Development Environment"
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Backend server stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Frontend server stopped"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if we're in the right directory
if [ ! -d "app" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check for virtual environment
if [ ! -d ".venv" ]; then
    echo -e "${RED}❌ Error: Virtual environment not found. Please create .venv first${NC}"
    exit 1
fi

# Start backend server
echo -e "${BLUE}Starting backend server...${NC}"
source .venv/bin/activate
python app/server.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend server started successfully on port 8000${NC}"
else
    echo -e "${RED}❌ Backend server failed to start${NC}"
    cleanup
    exit 1
fi

# Start frontend server
echo -e "${BLUE}Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 3

# Check if frontend is running
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✅ Frontend server started successfully on port 5173${NC}"
else
    echo -e "${RED}❌ Frontend server failed to start${NC}"
    cleanup
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo ""
echo "📡 Backend API:  http://localhost:8000"
echo "🌐 Frontend:     http://localhost:5173"
echo "📋 Health check: http://localhost:8000/health"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Keep script running and wait for processes
wait $BACKEND_PID $FRONTEND_PID