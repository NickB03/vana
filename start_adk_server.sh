#!/bin/bash
# Start ADK server with Web UI

echo "🚀 Starting ADK Web Server with UI..."
echo "=================================="
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
    echo "✅ Loading environment from .env.local"
    set -a
    source .env.local
    set +a
fi

# Ensure we're in virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Activating virtual environment..."
    source venv/bin/activate
fi

# Start ADK web server with UI
echo "📌 Starting server on http://localhost:8000"
echo "   - ADK UI: http://localhost:8000/"
echo "   - API Docs: http://localhost:8000/docs"
echo "   - Agent: http://localhost:8000/agents/vana"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the ADK web command
python -m google.adk.cli web \
    --host 127.0.0.1 \
    --port 8000 \
    --reload \
    --allow_origins "http://localhost:3000" \
    --allow_origins "http://localhost:3001" \
    --session_service_uri "sqlite:///sessions.db" \
    agents/