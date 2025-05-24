# n8n MCP Server Setup for VANA

This document provides instructions for setting up and using the n8n MCP (Model Context Protocol) server for the VANA project.

## Overview

The n8n MCP server allows Ben (Claude) to directly configure n8n workflows for memory management and knowledge graph operations through the Model Context Protocol. This integration enhances the VANA system with workflow orchestration, standardized command handling, and structured knowledge representation.

## Directory Structure

```
~/vana/
├── mcp-servers/
│   ├── n8n-mcp/             # n8n MCP server code
│   │   ├── build/           # Compiled server code
│   │   ├── src/             # Source code
│   │   ├── .env             # Environment variables
│   │   ├── start-mcp-server.sh  # Script to start the MCP server
│   │   └── claude-mcp-config.json  # Configuration for Claude
│   └── knowledge-graph/     # Knowledge Graph server code
│       ├── build/           # Compiled server code
│       ├── src/             # Source code
│       └── .env             # Environment variables
├── n8n-local/               # Local n8n installation
└── n8n-workflows/           # n8n workflow definitions
    ├── manual_memory_save.json  # Workflow for manual memory saving
    ├── daily_memory_sync.json   # Workflow for daily memory syncing
    └── kg_sync.json             # Workflow for Knowledge Graph syncing
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

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Vector Search Configuration
VECTOR_SEARCH_INDEX_ID=your_vector_search_index_id
VECTOR_SEARCH_ENDPOINT_ID=your_vector_search_endpoint_id
DEPLOYED_INDEX_ID=your_deployed_index_id

# MCP Knowledge Graph Configuration
MCP_API_KEY=your_mcp_api_key
MCP_SERVER_URL=https://mcp.community.augment.co
MCP_NAMESPACE=vana-project

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
        "GOOGLE_CLOUD_PROJECT": "your_google_cloud_project_id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account-key.json",
        "VECTOR_SEARCH_INDEX_ID": "your_vector_search_index_id",
        "VECTOR_SEARCH_ENDPOINT_ID": "your_vector_search_endpoint_id",
        "DEPLOYED_INDEX_ID": "your_deployed_index_id",
        "DEBUG": "true"
      },
      "disabled": false,
      "autoApprove": []
    },
    "kg": {
      "command": "node",
      "args": ["/Users/nick/Development/vana/mcp-servers/knowledge-graph/build/index.js"],
      "env": {
        "MCP_API_KEY": "your_mcp_api_key",
        "MCP_SERVER_URL": "https://mcp.community.augment.co",
        "MCP_NAMESPACE": "vana-project",
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

## MCP Commands

Once the MCP server is set up, Ben can use the following commands:

### Memory Commands

#### Basic Memory Commands
- `!memory_on` - Start buffering new chat turns
- `!memory_off` - Stop buffering, discard uncommitted memory
- `!rag` - Save buffered memory permanently into vector store
- `!rag tag <tag1> <tag2> ...` - Save with tags

#### Enhanced Memory Commands
- `!memory_filter date <query> <start_date> <end_date>` - Filter memories by date range
- `!memory_filter tags <query> <tag1> <tag2> ...` - Filter memories by tags
- `!memory_analytics` - Get analytics about stored memories
- `!memory_help` - Show help text for memory commands

### Knowledge Graph Commands

- `!kg_query [entity_type] [query]` - Search for entities in the Knowledge Graph
- `!kg_store [entity_name] [entity_type] [observation]` - Store new information
- `!kg_context` - Show the current Knowledge Graph context

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

### Vector Search Issues

If you encounter issues with Vector Search integration:

1. Verify that the Google Cloud environment variables are correctly set
2. Check that the service account has the necessary permissions
3. Ensure that the Vector Search index and endpoint exist
4. Test the Vector Search connection using the test_vector_search.py script

### Knowledge Graph Issues

If you encounter issues with the Knowledge Graph integration:

1. Verify that the MCP API key is valid
2. Check that the MCP server URL is accessible
3. Ensure that the namespace is correctly set
4. Test the Knowledge Graph connection using the test_mcp_connection.py script

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
- [Vertex AI Vector Search Documentation](https://cloud.google.com/vertex-ai/docs/vector-search/overview)
- [MCP Knowledge Graph Documentation](https://mcp.community.augment.co/docs)
- [VANA Knowledge Graph Setup](implementation/knowledge-graph.md)
- [VANA Memory Operations](implementation/memory-implementation.md)
- [Vertex AI Transition Guide](integrations/vertex-ai/transition.md)
