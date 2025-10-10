#!/bin/bash
# Start ADK server with Web UI on port 8080

echo "🚀 Starting ADK Web Server with UI on port 8080..."
echo "=================================="
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
    echo "✅ Loading environment from .env.local"
    set -a
    source .env.local
    set +a
fi

# Load app environment variables for ADK agent import
if [ -f "app/.env.local" ]; then
    echo "✅ Loading app environment from app/.env.local"
    set -a
    source app/.env.local
    set +a
fi

# Set required environment variables if not already set
export SESSION_INTEGRITY_KEY="${SESSION_INTEGRITY_KEY:-dev_key_at_least_32_characters_long_for_session_security_validation}"
export AUTH_REQUIRE_SSE_AUTH="${AUTH_REQUIRE_SSE_AUTH:-false}"

# Ensure we're in virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Activating virtual environment..."
    source venv/bin/activate
fi

# Start ADK web server with UI on port 8080
echo "📌 Starting server on http://localhost:8080"
echo "   - ADK UI: http://localhost:8080/"
echo "   - API Docs: http://localhost:8080/docs"
echo "   - Agent: http://localhost:8080/agents/vana"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the ADK web command on port 8080
python -m google.adk.cli web \
    --host 127.0.0.1 \
    --port 8080 \
    --reload \
    --allow_origins "http://localhost:3000" \
    --allow_origins "http://localhost:3001" \
    --session_service_uri "sqlite:///sessions.db" \
    agents/
