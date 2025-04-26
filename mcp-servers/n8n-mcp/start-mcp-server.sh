#!/bin/bash

# Set environment variables
export N8N_API_URL=http://localhost:5678/api/v1
export N8N_API_KEY="your_n8n_api_key"
export N8N_WEBHOOK_USERNAME=vana_webhook
export N8N_WEBHOOK_PASSWORD=vana_webhook_password
export RAGIE_API_KEY="your_ragie_api_key"
export DEBUG=true

# Start the MCP server
node build/index.js
