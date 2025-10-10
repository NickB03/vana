#!/bin/bash
# Start ADK server with API key authentication

echo "🚀 Starting ADK Web Server with API Key Authentication..."
echo "========================================="
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
    echo "✅ Loading environment from .env.local"
    export $(grep -v '^#' .env.local | xargs)
fi

# Load app environment variables for ADK agent import
if [ -f "app/.env.local" ]; then
    echo "✅ Loading app environment from app/.env.local"
    export $(grep -v '^#' app/.env.local | xargs)
fi

# Set required environment variables if not already set
export SESSION_INTEGRITY_KEY="${SESSION_INTEGRITY_KEY:-dev_key_at_least_32_characters_long_for_session_security_validation}"
export AUTH_REQUIRE_SSE_AUTH="${AUTH_REQUIRE_SSE_AUTH:-false}"

# Ensure API key is set
if [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ Error: GOOGLE_API_KEY not found in .env.local"
    exit 1
fi

echo "✅ GOOGLE_API_KEY found"
echo ""

# Set authentication mode to use API key instead of ADC
export GOOGLE_GENAI_USE_VERTEXAI=FALSE

echo "📌 Starting server on http://localhost:8080"
echo "   - Using API Key authentication"
echo "   - Model: gemini-1.5-flash"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run ADK web server with API key authentication
uv run --env-file .env.local adk web agents/ --port 8080 --allow_origins "http://localhost:3000"