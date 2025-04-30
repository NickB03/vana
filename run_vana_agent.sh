#!/bin/bash
# Launch script for the VANA agent with MCP integration (without starting a new web server)

set -e  # Exit on error

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
  echo "   Using placeholder value for testing."
  export MCP_API_KEY="placeholder_mcp_api_key"
fi

# Check for Google Application Credentials
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "⚠️  Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set."
  echo "   This is required for Vertex AI services."
  echo "   Example: export GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account-key.json"
fi

# Check Python path
echo "🔄 Setting up Python path..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export PYTHONPATH="$SCRIPT_DIR:$SCRIPT_DIR/adk-setup:$PYTHONPATH"
echo "   PYTHONPATH set to: $PYTHONPATH"

# Run the VANA agent
echo "🚀 Starting VANA agent..."
echo "   Using existing ADK web server at http://localhost:8000"
echo ""

cd adk-setup
python -m vana.agents.vana

# Instructions for using the agent
echo ""
echo "======================================================"
echo "VANA Agent has stopped!"
echo "======================================================"
echo ""
