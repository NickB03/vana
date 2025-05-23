#!/bin/bash
# Launch script for the VANA agent with MCP integration

set -e  # Exit on error

# Detect OS and provide appropriate command to open a URL
open_url() {
  url=$1
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$url"
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows with Git Bash or similar
    start "$url"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open &>/dev/null; then
      xdg-open "$url"
    elif command -v gnome-open &>/dev/null; then
      gnome-open "$url"
    else
      echo "Please open this URL manually: $url"
    fi
  else
    echo "Please open this URL manually: $url"
  fi
}

# ASCII Art VANA Logo
echo "======================================================"
echo "
██╗   ██╗ █████╗ ███╗   ██╗ █████╗
██║   ██║██╔══██╗████╗  ██║██╔══██╗
██║   ██║███████║██╔██╗ ██║███████║
╚██╗ ██╔╝██╔══██║██║╚██╗██║██╔══██║
 ╚████╔╝ ██║  ██║██║ ╚████║██║  ██║
  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
"
echo "Versatile Agent Network Architecture"
echo "======================================================"
echo ""

# Check if virtual environment exists and activate it
if [ -d ".venv" ]; then
  echo "🔄 Activating virtual environment..."
  source .venv/bin/activate
else
  echo "❌ Error: Virtual environment not found."
  echo "   Please run setup_vana.py first."
  exit 1
fi

# Check if MCP_API_KEY is set
if [ -z "$MCP_API_KEY" ]; then
  echo "⚠️  Warning: MCP_API_KEY environment variable is not set."
  echo "   If you want to use Knowledge Graph and Vector Search through MCP,"
  echo "   please set this variable before running this script."
  echo "   Example: export MCP_API_KEY=your_api_key"
fi

# Check for Google Application Credentials
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "⚠️  Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set."
  echo "   This is required for Vertex AI services."
  echo "   Example: export GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account-key.json"
fi

# Check if ADK is installed
if ! command -v adk &>/dev/null; then
  echo "❌ Error: Google ADK CLI not found."
  echo "   Please install it with: pip install -U google-generativeai[adk]"
  exit 1
fi

# Test MCP connection
echo "🔄 Testing MCP connection..."
if python scripts/test_mcp_connection.py --api-key "$MCP_API_KEY" > /dev/null 2>&1; then
  echo "✅ MCP connection successful!"
else
  echo "⚠️  Warning: MCP connection test failed."
  echo "   The agent will run with limited functionality."
  echo "   Check your MCP API key and server configuration."
fi

# Check Python path
echo "🔄 Setting up Python path..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export PYTHONPATH="$SCRIPT_DIR:$SCRIPT_DIR/adk-setup:$PYTHONPATH"
echo "   PYTHONPATH set to: $PYTHONPATH"

# Launch ADK web UI
echo "🚀 Starting VANA agent with ADK web UI..."
echo "   This will open your web browser. If it doesn't open automatically,"
echo "   please navigate to http://localhost:8000"
echo ""

cd adk-setup
adk web &
ADK_PID=$!

# Give ADK time to start
sleep 2

# Open the browser
open_url "http://localhost:8000"

# Instructions for using the agent
echo ""
echo "======================================================"
echo "VANA Agent is now running!"
echo "======================================================"
echo ""
echo "Use the web interface to interact with the agent."
echo ""
echo "Available knowledge tools:"
echo "  - !vector_search {query} - Search vector database"
echo "  - !kg_query {entity_type} {query} - Query Knowledge Graph"
echo "  - !hybrid_search {query} - Search both systems"
echo "  - !kg_store {entity} {type} {observation} - Store in Knowledge Graph"
echo ""
echo "Persistent Memory commands:"
echo "  - !remember {fact} - Store a fact in persistent memory"
echo "  - !recall {query} - Recall information from persistent memory"
echo "  - !forget {entity} - Remove an entity from persistent memory"
echo "  - !list_memories - List all memories stored in the system"
echo ""
echo "Press Ctrl+C to stop the agent."
echo ""

# Wait for user to press Ctrl+C
trap "kill $ADK_PID 2>/dev/null || true; echo ''; echo 'Stopping VANA agent...'; echo 'Goodbye!'; exit 0" INT
wait $ADK_PID
