#!/bin/bash
# Main script to run both frontend and backend servers for VANA local development

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default ports
BACKEND_PORT=5000
FRONTEND_PORT=8501

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --backend-port)
        BACKEND_PORT="$2"
        shift
        shift
        ;;
        --frontend-port)
        FRONTEND_PORT="$2"
        shift
        shift
        ;;
        *)
        echo -e "${RED}Unknown option: $1${NC}"
        exit 1
        ;;
    esac
done

# Export environment variables
export BACKEND_PORT=$BACKEND_PORT
export FRONTEND_PORT=$FRONTEND_PORT
export FLASK_DEBUG=true

echo -e "${YELLOW}Starting VANA local development environment...${NC}"
echo -e "${YELLOW}Backend port: ${BACKEND_PORT}${NC}"
echo -e "${YELLOW}Frontend port: ${FRONTEND_PORT}${NC}"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}tmux is not installed. Please install it to run both servers simultaneously.${NC}"
    echo -e "${YELLOW}You can run the servers separately:${NC}"
    echo -e "    cd backend && source .venv/bin/activate && python run_backend.py"
    echo -e "    cd frontend && source .venv/bin/activate && python run_frontend.py"
    exit 1
fi

# Check if backend and frontend are set up
if [ ! -d "backend/.venv" ] || [ ! -d "frontend/.venv" ]; then
    echo -e "${YELLOW}Setting up environments...${NC}"
    
    # Set up backend
    if [ ! -d "backend/.venv" ]; then
        echo -e "${YELLOW}Setting up backend environment...${NC}"
        cd backend && bash setup.sh
        cd ..
    fi
    
    # Set up frontend
    if [ ! -d "frontend/.venv" ]; then
        echo -e "${YELLOW}Setting up frontend environment...${NC}"
        cd frontend && bash setup.sh
        cd ..
    fi
fi

# Create a new tmux session
echo -e "${YELLOW}Starting tmux session...${NC}"
tmux new-session -d -s vana-local-dev

# Split the window horizontally
tmux split-window -h -t vana-local-dev

# Start backend server in the left pane
tmux send-keys -t vana-local-dev:0.0 "cd backend && source .venv/bin/activate && python run_backend.py" C-m

# Start frontend server in the right pane
tmux send-keys -t vana-local-dev:0.1 "cd frontend && source .venv/bin/activate && python run_frontend.py" C-m

# Attach to the tmux session
echo -e "${GREEN}VANA local development environment started.${NC}"
echo -e "${YELLOW}Press Ctrl+B then D to detach from tmux session.${NC}"
echo -e "${YELLOW}To reattach later, run: tmux attach -t vana-local-dev${NC}"
echo -e "${YELLOW}To stop the servers, run: tmux kill-session -t vana-local-dev${NC}"

tmux attach -t vana-local-dev
