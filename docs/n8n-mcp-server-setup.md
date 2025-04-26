# n8n MCP Server Setup for VANA

This document provides instructions for setting up and using the n8n MCP (Model Context Protocol) server for the VANA project.

## Overview

The n8n MCP server allows Ben (Claude) to directly configure n8n workflows for memory management through the Model Context Protocol. This integration is part of Phase 2 of the VANA project, enhancing the memory system with workflow orchestration and standardized command handling.

## Directory Structure

```
~/vana/
├── mcp-servers/
│   └── n8n-mcp/             # n8n MCP server code
│       ├── build/           # Compiled server code
│       ├── src/             # Source code
│       ├── .env             # Environment variables
│       ├── start-mcp-server.sh  # Script to start the MCP server
│       └── claude-mcp-config.json  # Configuration for Claude
└── n8n-local/               # Local n8n installation
```

## Configuration Files

### .env

The `.env` file contains the necessary environment variables for the MCP server:

```
# n8n API Configuration
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your_n8n_api_key

# Webhook Authentication
N8N_WEBHOOK_USERNAME=vana_webhook
N8N_WEBHOOK_PASSWORD=vana_webhook_password

# Ragie API Key
RAGIE_API_KEY=your_ragie_api_key

# Debug mode
DEBUG=true
```

### claude-mcp-config.json

This file configures Claude to access the MCP server:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["/Users/nick/Development/vana/mcp-servers/n8n-mcp/build/index.js"],
      "env": {
        "N8N_API_URL": "http://localhost:5678/api/v1",
        "N8N_API_KEY": "your_n8n_api_key",
        "N8N_WEBHOOK_USERNAME": "vana_webhook",
        "N8N_WEBHOOK_PASSWORD": "vana_webhook_password",
        "RAGIE_API_KEY": "your_ragie_api_key",
        "DEBUG": "true"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Starting the Environment

We've created a script to launch the VANA environment with the MCP server:

```bash
~/vana/launch_vana_with_mcp.sh
```

This script:
1. Starts the ADK web interface in a new terminal window
2. Starts the MCP server in a separate terminal window
3. Opens the browser to the ADK web interface

## Using the MCP Server with Claude

To use the MCP server with Claude:

1. For Claude Desktop:
   - Go to Settings > Advanced
   - Add the path to the `claude-mcp-config.json` file

2. For VS Code with Anthropic extension:
   - Open VS Code settings
   - Search for "Anthropic: MCP Config"
   - Add the path to the `claude-mcp-config.json` file

## Memory Commands

Once the MCP server is set up, Ben can use the following memory commands:

- `!memory_on` - Start buffering new chat turns
- `!memory_off` - Stop buffering, discard uncommitted memory
- `!rag` - Save buffered memory permanently into vector store

## Troubleshooting

### Node.js Version Compatibility

n8n requires Node.js v18.17.0, v20, or v22. If you're using a different version, you may encounter compatibility issues. To resolve this:

1. Install a compatible Node.js version using nvm:
   ```bash
   nvm install 20
   nvm use 20
   ```

2. Then start n8n:
   ```bash
   npx n8n start
   ```

### MCP Server Connection Issues

If the MCP server fails to connect to n8n:

1. Make sure n8n is running on http://localhost:5678
2. Verify that the API key in the `.env` file is correct
3. Check the n8n logs for any errors

### n8n API Key

To create a new API key in n8n:

1. Start n8n and access the web interface
2. Go to Settings > API
3. Create a new API key
4. Update the `.env` file and `claude-mcp-config.json` with the new key

## Resources

- [n8n MCP Server GitHub Repository](https://github.com/leonardsellem/n8n-mcp-server)
- [Model Context Protocol Documentation](https://github.com/anthropics/anthropic-cookbook/tree/main/mcp)
- [n8n Documentation](https://docs.n8n.io/)
