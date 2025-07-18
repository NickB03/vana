#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting VANA UI Integration${NC}"
echo "================================"

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n${RED}🛑 Stopping services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up trap to call cleanup on script exit
trap cleanup EXIT INT TERM

# Check dependencies
echo -e "${GREEN}📋 Checking dependencies...${NC}"

# Check Python 3.13
if ! python3.13 --version &>/dev/null; then
    if command -v python3 &>/dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
        PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
        
        if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 13 ]; then
            echo -e "${GREEN}✅ Python $PYTHON_VERSION found${NC}"
        else
            echo -e "${RED}❌ Python 3.13+ required, found $PYTHON_VERSION${NC}"
            echo "Please install Python 3.13: brew install python@3.13"
            exit 1
        fi
    else
        echo -e "${RED}❌ Python not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Python 3.13 found${NC}"
fi

# Check Poetry and install dependencies if needed
if ! command -v poetry &>/dev/null; then
    echo -e "${RED}❌ Poetry not found${NC}"
    echo "Install with: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Install Python dependencies if needed
if [ ! -d ".venv" ] && ! poetry env info &>/dev/null 2>&1; then
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    poetry install
fi

# Check Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Install with: brew install node"
    exit 1
fi

# Install frontend dependencies if needed
if [ ! -d "vana-ui/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    (cd vana-ui && npm install)
fi

# Check environment file
if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo -e "${YELLOW}📝 Created .env.local - Please add your GOOGLE_API_KEY${NC}"
    else
        echo -e "${RED}❌ No .env.local file found${NC}"
        exit 1
    fi
fi

# Start VANA backend
echo -e "\n${GREEN}🔧 Starting VANA backend on port 8081...${NC}"
if command -v python3.13 &>/dev/null; then
    poetry run python3.13 main.py &
else
    poetry run python main.py &
fi
BACKEND_PID=$!

# Wait for backend to start with progress indicator
echo -ne "${YELLOW}⏳ Waiting for backend to initialize${NC}"
for i in {1..10}; do
    if curl -s http://localhost:8081/health > /dev/null 2>&1; then
        echo -e "\n${GREEN}✅ Backend is running!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Check if backend started successfully
if ! curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo -e "\n${RED}❌ Backend failed to start. Check the logs above.${NC}"
    exit 1
fi

# Start frontend
echo -e "\n${GREEN}🎨 Starting VANA UI frontend on port 5173...${NC}"
cd vana-ui
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo -ne "${YELLOW}⏳ Waiting for frontend to initialize${NC}"
for i in {1..10}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "\n${GREEN}✅ Frontend is running!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo -e "\n${GREEN}✅ VANA UI Integration is running!${NC}"
echo "================================"
echo -e "🔗 Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "🔗 Backend API: ${GREEN}http://localhost:8081${NC}"
echo -e "🔗 API Docs: ${GREEN}http://localhost:8081/docs${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
