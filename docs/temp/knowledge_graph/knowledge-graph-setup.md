# MCP Knowledge Graph Setup for VANA

This document explains how to set up and use the Model Context Protocol (MCP) Knowledge Graph with the VANA project.

## Overview

The MCP Knowledge Graph provides persistent memory across sessions, allowing agents to maintain context and knowledge over time. Instead of self-hosting, we're using a community-hosted MCP server to reduce costs and simplify access across devices.

## Setup Instructions

### 1. Configure Augment to Use MCP Knowledge Graph

1. Open Augment settings
2. Navigate to the "Knowledge Graph" section
3. Select "MCP" as the provider
4. Enter the following configuration:
   - Server URL: `PLACEHOLDER_MCP_SERVER_URL`
   - Namespace: `vana-project` (or your preferred namespace)
   - API Key: (obtain from the MCP community server)

Alternatively, you can create an `augment-config.json` file in your project root with the following content:

```json
{
  "knowledgeGraph": {
    "provider": "mcp",
    "config": {
      "serverUrl": "PLACEHOLDER_MCP_SERVER_URL",
      "namespace": "vana-project",
      "apiKey": "YOUR_API_KEY_HERE"
    }
  },
  "memory": {
    "enabled": true,
    "autoSave": true,
    "autoLoad": true
  }
}
```

### 2. Import Claude Chat History

To import your past Claude chat history into the MCP Knowledge Graph:

1. Export your Claude chat history (format depends on your Claude interface)
2. Run the import script:

```bash
python scripts/import_claude_history.py --input path/to/claude_history.json --api-key YOUR_API_KEY
```

This script will:
- Parse your chat history
- Extract entities and relationships
- Store them in the MCP Knowledge Graph
- Make the information available to your agents

## Using the Knowledge Graph

### Basic Commands

Once set up, you can use the following commands to interact with the Knowledge Graph:

- `!kg_query [entity_type] [query]` - Search for entities in the Knowledge Graph
- `!kg_store [entity_name] [entity_type] [observation]` - Store new information
- `!kg_context` - Show the current Knowledge Graph context

### Integration with Agents

The Knowledge Graph is automatically integrated with your agents through the MCP interface. Agents can:

1. Retrieve relevant information from past conversations
2. Store new information for future reference
3. Build a structured knowledge base over time

## Monitoring and Management

To monitor and manage your Knowledge Graph:

1. Visit the MCP community dashboard (URL provided when you obtain your API key)
2. Navigate to your namespace
3. View entities, relationships, and usage statistics
4. Manage permissions and access controls

## Troubleshooting

If you encounter issues with the Knowledge Graph:

1. **Connection Issues**
   - Verify your API key is correct
   - Check that the server URL is accessible
   - Ensure your network allows the connection

2. **Import Problems**
   - Check the format of your chat history file
   - Look for error messages in the import script output
   - Try importing a smaller subset of conversations

3. **Query Issues**
   - Verify that entities exist in the Knowledge Graph
   - Check your query syntax
   - Try broader queries to see if any results are returned

## Next Steps

After setting up the Knowledge Graph:

1. **Populate with Domain Knowledge**
   - Import key project documents
   - Add important entities manually
   - Create relationships between entities

2. **Enhance Agent Instructions**
   - Update agent prompts to leverage the Knowledge Graph
   - Add examples of Knowledge Graph queries
   - Encourage agents to store new information

3. **Monitor and Refine**
   - Review how agents use the Knowledge Graph
   - Identify gaps in knowledge
   - Refine entity and relationship types
