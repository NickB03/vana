#!/bin/bash

# VANA Codex Environment Setup Script
# This script sets up all required environment variables for VANA in Codex

echo "🚀 Setting up VANA environment variables in Codex..."

# Function to set environment variable via Codex CLI
set_env_var() {
    local key=$1
    local value=$2
    echo "Setting $key..."
    
    # Try different Codex CLI commands (adjust based on actual Codex CLI)
    if command -v codex &> /dev/null; then
        codex env set "$key" "$value"
    elif command -v cx &> /dev/null; then
        cx env set "$key" "$value"
    else
        echo "⚠️  Codex CLI not found. Please set manually: $key=$value"
    fi
}

# Core API Keys (use secrets for these)
echo "🔑 Setting API Keys..."
set_env_var "BRAVE_API_KEY" "BSA6fMCYrfJC5seE-AVsWrKjpOFk6Nm"
set_env_var "OPENROUTER_API_KEY" "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"

# Google Cloud Configuration
echo "☁️ Setting Google Cloud config..."
set_env_var "GOOGLE_CLOUD_PROJECT" "analystai-454200"
set_env_var "GOOGLE_CLOUD_LOCATION" "us-central1"
set_env_var "GOOGLE_GENAI_USE_VERTEXAI" "False"

# VANA Configuration
echo "🤖 Setting VANA config..."
set_env_var "VANA_MODEL" "deepseek/deepseek-r1-0528:free"
set_env_var "VANA_ENV" "development"
set_env_var "VANA_HOST" "0.0.0.0"
set_env_var "API_PORT" "8000"
set_env_var "LOG_LEVEL" "DEBUG"

# Feature Flags
echo "🎛️ Setting feature flags..."
set_env_var "VANA_FEATURE_MCP_ENABLED" "true"
set_env_var "VANA_FEATURE_WORKFLOW_ENABLED" "true"
set_env_var "VANA_FEATURE_VECTOR_SEARCH_ENABLED" "true"
set_env_var "VANA_FEATURE_WEB_INTERFACE_ENABLED" "true"
set_env_var "DASHBOARD_ENABLED" "true"

# RAG Configuration
echo "🧠 Setting RAG config..."
set_env_var "VANA_RAG_CORPUS_ID" "projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
set_env_var "MEMORY_SIMILARITY_TOP_K" "5"
set_env_var "MEMORY_VECTOR_DISTANCE_THRESHOLD" "0.7"
set_env_var "SESSION_SERVICE_TYPE" "in_memory"

# Vector Search Configuration
echo "🔍 Setting vector search config..."
set_env_var "VECTOR_SEARCH_DIMENSIONS" "768"

# Poetry Configuration
echo "📦 Setting Poetry config..."
set_env_var "POETRY_VENV_IN_PROJECT" "true"
set_env_var "POETRY_CACHE_DIR" "/tmp/poetry-cache"
set_env_var "POETRY_NO_INTERACTION" "1"
set_env_var "PYTHONPATH" "/workspace/vana"

# Development Configuration
echo "🛠️ Setting development config..."
set_env_var "USE_MOCK_DATA" "false"
set_env_var "USE_LOCAL_MCP" "false"
set_env_var "VANA_USE_MOCK" "false"

echo "✅ Environment setup complete!"
echo ""
echo "📋 Manual steps if CLI didn't work:"
echo "1. Go to Codex Environment settings"
echo "2. Add the variables listed in codex-environment.env"
echo "3. For API keys, use the Secrets section instead"
echo ""
echo "🔐 Recommended: Move these to Secrets section:"
echo "   - BRAVE_API_KEY"
echo "   - OPENROUTER_API_KEY"
echo "   - GOOGLE_API_KEY (if you have one)"
