#!/bin/bash
# Launch VANA with environment validation
# This script validates the environment configuration before starting the ADK server

# Change to the project directory
cd "$(dirname "$0")"

# Display welcome message
echo "====================================="
echo "  VANA - Multi-Agent System Launcher"
echo "====================================="
echo ""
echo "Validating environment configuration..."

# Activate the virtual environment
source .venv/bin/activate

# Check if the virtual environment was activated successfully
if [ $? -ne 0 ]; then
    echo "Error: Failed to activate virtual environment."
    echo "Please make sure you have set up the environment correctly."
    echo "See README.md for setup instructions."
    exit 1
fi

# Run environment validation
python scripts/validate_environment.py

# Check if validation was successful
if [ $? -ne 0 ]; then
    echo "Error: Environment validation failed."
    echo "Please fix the issues above before starting the ADK server."
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

# Check for Google Search API key
if [ -z "$GOOGLE_SEARCH_API_KEY" ] || [ -z "$GOOGLE_SEARCH_ENGINE_ID" ]; then
  echo "⚠️  Warning: Google Search API key or Search Engine ID not set."
  echo "   Web search capabilities will be disabled."
  echo "   Export GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID to enable web search."
  echo ""
fi

# Check for MCP API key
if [ -z "$MCP_API_KEY" ]; then
  echo "⚠️  Warning: MCP_API_KEY environment variable is not set."
  echo "   Knowledge Graph capabilities will be disabled."
  echo "   Export MCP_API_KEY to enable Knowledge Graph functionality."
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
