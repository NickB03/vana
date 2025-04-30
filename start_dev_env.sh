#!/bin/bash
# start_dev_env.sh - Script to start the local development environment

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Create data directories if they don't exist
mkdir -p kg-data
mkdir -p n8n-data

# Start the local MCP server and n8n
echo "Starting local MCP server and n8n..."
docker-compose up -d

# Wait for server to initialize
echo "Waiting for MCP server to initialize..."
sleep 5

# Initialize the knowledge graph with basic schema
echo "Initializing knowledge graph schema..."
python scripts/initialize_kg_schema.py

echo "Development environment ready!"
echo "MCP server available at: http://localhost:5000"
echo "n8n available at: http://localhost:5678"
echo ""
echo "To stop the environment, run: docker-compose down"
