#!/bin/bash

# Define paths to environment files
LOCAL_ENV_FILE=".env"
PROJECT_ROOT_ENV_FILE="../../.env"
SECRETS_ENV_FILE="../../secrets/.env"

# Check which environment files exist
LOCAL_EXISTS=false
ROOT_EXISTS=false
SECRETS_EXISTS=false

if [ -f "$LOCAL_ENV_FILE" ]; then
  LOCAL_EXISTS=true
fi

if [ -f "$PROJECT_ROOT_ENV_FILE" ]; then
  ROOT_EXISTS=true
fi

if [ -f "$SECRETS_ENV_FILE" ]; then
  SECRETS_EXISTS=true
fi

# Load environment variables in order of preference
# 1. secrets/.env (most secure)
# 2. project root .env
# 3. local .env

ENV_LOADED=false

if $SECRETS_EXISTS; then
  echo "Loading environment variables from secrets/.env file"
  set -a
  source "$SECRETS_ENV_FILE"
  set +a
  ENV_LOADED=true
elif $ROOT_EXISTS; then
  echo "Loading environment variables from project root .env file"
  echo "NOTE: For better security, consider moving credentials to secrets/.env"
  set -a
  source "$PROJECT_ROOT_ENV_FILE"
  set +a
  ENV_LOADED=true
elif $LOCAL_EXISTS; then
  echo "Loading environment variables from local .env file"
  echo "NOTE: For better security, consider moving credentials to secrets/.env"
  set -a
  source "$LOCAL_ENV_FILE"
  set +a
  ENV_LOADED=true
fi

# Check if any environment file was loaded
if ! $ENV_LOADED; then
  echo "Error: No environment files found. Please create one based on .env.example"
  echo "Preferred locations (in order of preference):"
  echo "1. secrets/.env (most secure, recommended)"
  echo "2. .env (in project root)"
  echo "3. mcp-servers/n8n-mcp/.env (local to MCP server)"
  exit 1
fi

# Verify required environment variables are set
REQUIRED_VARS=("N8N_API_KEY" "RAGIE_API_KEY")
MISSING_VARS=false

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "Error: Required environment variable $VAR is not set"
    MISSING_VARS=true
  fi
done

if $MISSING_VARS; then
  echo "Please check your .env file and ensure all required variables are set"
  exit 1
fi

echo "Environment variables loaded successfully"

# Start the MCP server
node build/index.js
