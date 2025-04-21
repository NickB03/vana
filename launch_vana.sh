#!/bin/bash
# Launch VANA environment with virtual environment and web server
# This script activates the Python virtual environment and starts the ADK web server

# Change to the project directory
cd "$(dirname "$0")"

# Display welcome message
echo "====================================="
echo "  VANA - Multi-Agent System Launcher"
echo "====================================="
echo ""
echo "Starting VANA environment..."

# Activate the virtual environment
source .venv/bin/activate

# Check if the virtual environment was activated successfully
if [ $? -ne 0 ]; then
    echo "Error: Failed to activate virtual environment."
    echo "Please make sure you have set up the environment correctly."
    echo "See README.md for setup instructions."
    exit 1
fi

# Display environment information
echo "Python version: $(python --version)"
echo "Virtual environment: $(which python)"
echo ""

# Check if Vector Search is set up
if [ -d "knowledge_docs" ] && [ "$(ls -A knowledge_docs)" ]; then
    echo "Knowledge documents found in knowledge_docs directory."
else
    echo "Warning: No knowledge documents found in knowledge_docs directory."
    echo "Vector Search functionality may be limited."
    echo ""
fi

# Start the ADK web server
echo "Starting ADK web server..."
echo "The web interface will be available at http://localhost:8000"
echo ""
echo "Note: This terminal window must remain open while using VANA."
echo "Press Ctrl+C to stop the server when you're done."
echo "====================================="
echo ""

# Change to the ADK setup directory and start the web server
cd adk-setup
adk web

# This point is reached only if the web server is stopped
echo ""
echo "ADK web server has been stopped."
echo "VANA environment is shutting down."
echo ""

# Deactivate the virtual environment
deactivate

echo "VANA environment has been shut down."
