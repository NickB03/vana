#!/bin/bash
# Quick Local Deployment Script for VANA
# Simplified version for rapid local testing

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 VANA Quick Local Deployment${NC}"
echo "================================"

# Navigate to project root
cd "$(dirname "$0")/.."

# Check Python version
echo -e "\n${YELLOW}📋 Checking prerequisites${NC}"
python_version=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
if [[ $(echo "$python_version >= 3.13" | bc) -eq 1 ]]; then
    echo -e "${GREEN}✅ Python $python_version${NC}"
else
    echo -e "${RED}❌ Python $python_version (3.13+ required)${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
fi

# Install dependencies if needed
if [ ! -d ".venv" ] || [ ! -f "poetry.lock" ]; then
    echo -e "\n${YELLOW}📦 Installing dependencies${NC}"
    poetry install --no-interaction --no-ansi
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Kill any existing backend processes
echo -e "\n${YELLOW}🧹 Cleaning up existing processes${NC}"
pkill -f "uvicorn main:app" || true
pkill -f "python main.py" || true
pkill -f "npm run dev" || true
sleep 2

# Start backend
echo -e "\n${YELLOW}🔧 Starting backend server${NC}"
poetry run python main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:8081/health > /dev/null; then
        echo -e "${GREEN}✅ Backend is running on http://localhost:8081${NC}"
        break
    fi
    sleep 1
done

# Start frontend
echo -e "\n${YELLOW}🎨 Starting frontend${NC}"
cd vana-ui
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend
echo "Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is running on http://localhost:5173${NC}"
        break
    fi
    sleep 1
done

# Summary
echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo "========================"
echo -e "Backend: ${GREEN}http://localhost:8081${NC}"
echo -e "Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "Health Check: ${GREEN}http://localhost:8081/health${NC}"
echo ""
echo "To stop services:"
echo "  kill $BACKEND_PID    # Stop backend"
echo "  kill $FRONTEND_PID   # Stop frontend"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Keep script running
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e '\n${YELLOW}Services stopped${NC}'" EXIT
wait