#!/bin/bash
# Script to run simple test servers for VANA local development

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

echo -e "${YELLOW}Starting VANA simple test environment...${NC}"
echo -e "${YELLOW}Backend port: ${BACKEND_PORT}${NC}"
echo -e "${YELLOW}Frontend port: ${FRONTEND_PORT}${NC}"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}tmux is not installed. Please install it to run both servers simultaneously.${NC}"
    echo -e "${YELLOW}You can run the servers separately:${NC}"
    echo -e "    cd backend && python3 simple_server.py"
    echo -e "    cd frontend && streamlit run simple_app.py"
    exit 1
fi

# Create a new tmux session
echo -e "${YELLOW}Starting tmux session...${NC}"
tmux new-session -d -s vana-simple-test

# Split the window horizontally
tmux split-window -h -t vana-simple-test

# Start backend server in the left pane
tmux send-keys -t vana-simple-test:0.0 "cd backend && python3 simple_server.py" C-m

# Start frontend server in the right pane
tmux send-keys -t vana-simple-test:0.1 "cd frontend && streamlit run simple_app.py" C-m

# Attach to the tmux session
echo -e "${GREEN}VANA simple test environment started.${NC}"
echo -e "${YELLOW}Press Ctrl+B then D to detach from tmux session.${NC}"
echo -e "${YELLOW}To reattach later, run: tmux attach -t vana-simple-test${NC}"
echo -e "${YELLOW}To stop the servers, run: tmux kill-session -t vana-simple-test${NC}"

tmux attach -t vana-simple-test
