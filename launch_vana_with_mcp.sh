#!/bin/bash

# Set the base directory
BASE_DIR="$HOME/Development/vana"
MCP_DIR="$BASE_DIR/mcp-servers/n8n-mcp"

# Function to start a new terminal window
start_terminal() {
    osascript -e "tell application \"Terminal\" to do script \"$1\""
}

# Activate the virtual environment and start the VANA environment
start_terminal "cd $BASE_DIR && source .venv/bin/activate && cd adk-setup && adk web"

# Start the MCP server in a new terminal window
start_terminal "cd $MCP_DIR && ./start-mcp-server.sh"

# Open the browser to the ADK web interface
sleep 5
open http://localhost:8000

echo "VANA environment with MCP server started successfully!"
echo "ADK web interface: http://localhost:8000"
echo "MCP server is running in a separate terminal window"
