# n8n Workflows for VANA

This directory contains n8n workflow definitions for the VANA project. These workflows are used for memory management, knowledge graph synchronization, and document processing.

## Workflows

### 1. Memory Save

**File**: `memory_save.json`

This workflow is triggered by the `!rag` command and saves the current chat buffer to Vector Search and Knowledge Graph.

**Nodes**:
- **Webhook**: Receives the buffer data from the MCP interface
- **Check Memory Status**: Verifies that memory recording is active
- **Format For Vector Search**: Formats the buffer data for Vector Search
- **Extract Entities**: Extracts entities from the buffer for Knowledge Graph
- **Upload to Vector Search**: Sends the formatted data to Vector Search
- **Upload to Knowledge Graph**: Sends the extracted entities to Knowledge Graph
- **Combine Results**: Combines the results from Vector Search and Knowledge Graph
- **Respond to Webhook**: Sends the response back to the caller

**Webhook Configuration**:
- **Path**: `/save-memory`
- **Method**: `POST`
- **Authentication**: Basic Auth

### 2. Memory Sync

**File**: `memory_sync.json`

This workflow synchronizes memory between components.

**Nodes**:
- **Webhook**: Receives the sync request
- **Process Parameters**: Processes the input parameters
- **Sync Vector Search**: Synchronizes with Vector Search
- **Sync Knowledge Graph**: Synchronizes with Knowledge Graph
- **Combine Results**: Combines the results from Vector Search and Knowledge Graph
- **Respond to Webhook**: Sends the response back to the caller

**Webhook Configuration**:
- **Path**: `/memory-sync`
- **Method**: `POST`
- **Authentication**: Basic Auth

### 3. Knowledge Graph Sync

**File**: `kg_sync.json`

This workflow synchronizes entities with the Knowledge Graph.

**Nodes**:
- **Webhook**: Receives the sync request
- **Process Entities**: Processes the input entities
- **Check Entities**: Checks if there are entities to sync
- **Upload to Knowledge Graph**: Sends the entities to Knowledge Graph
- **Success Response**: Creates a success response
- **No Entities Response**: Creates a response for when there are no entities
- **Respond to Webhook**: Sends the response back to the caller

**Webhook Configuration**:
- **Path**: `/kg-sync`
- **Method**: `POST`
- **Authentication**: Basic Auth

### 4. Document Processing

**File**: `document_processing.json`

This workflow processes documents and adds them to Vector Search and Knowledge Graph.

**Nodes**:
- **Webhook**: Receives the document processing request
- **Process Parameters**: Processes the input parameters
- **Check Document Path**: Checks if the document path is valid
- **Read Document**: Reads the document content
- **Process Document**: Processes the document content
- **Extract Entities**: Extracts entities from the document
- **Upload to Vector Search**: Sends the document chunks to Vector Search
- **Upload to Knowledge Graph**: Sends the extracted entities to Knowledge Graph
- **Combine Results**: Combines the results from Vector Search and Knowledge Graph
- **Respond to Webhook**: Sends the response back to the caller

**Webhook Configuration**:
- **Path**: `/document-processing`
- **Method**: `POST`
- **Authentication**: Basic Auth

## Importing Workflows

To import these workflows into n8n:

1. Open n8n in your browser
2. Go to "Workflows" in the sidebar
3. Click "Import from File"
4. Select the workflow JSON file
5. Click "Import"

## Configuring Credentials

These workflows require the following credentials:

1. **HTTP Header Auth for Vector Search API**:
   - Name: `Vector Search API Key`
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_VECTOR_SEARCH_API_KEY`

2. **HTTP Header Auth for MCP API**:
   - Name: `MCP API Key`
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_MCP_API_KEY`

3. **Basic Auth for Webhooks**:
   - Name: `Webhook Auth`
   - Username: `vana_webhook`
   - Password: `vana_webhook_password`

## Environment Variables

These workflows use the following environment variables:

- `VECTOR_SEARCH_API_URL`: URL of the Vector Search API
- `MCP_SERVER_URL`: URL of the MCP server
- `MCP_NAMESPACE`: Namespace for the MCP server

## Activating Workflows

After importing and configuring credentials:

1. Open the workflow
2. Click "Activate" in the top right
3. Copy the webhook URL and update the corresponding environment variable in your `.env` file

## Testing Workflows

### Memory Save

You can test this workflow by sending a POST request to the webhook URL:

```bash
curl -X POST \
  -u "vana_webhook:vana_webhook_password" \
  -H "Content-Type: application/json" \
  -d '{
    "buffer": [
      {"role": "user", "content": "How do I implement memory in VANA?"},
      {"role": "assistant", "content": "You can use the memory management system..."}
    ],
    "memory_on": true
  }' \
  http://localhost:5678/webhook/save-memory
```

### Memory Sync

You can test this workflow by sending a POST request to the webhook URL:

```bash
curl -X POST \
  -u "vana_webhook:vana_webhook_password" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "session_id": "session456",
    "last_sync": "2023-01-01T00:00:00Z"
  }' \
  http://localhost:5678/webhook/memory-sync
```

### Knowledge Graph Sync

You can test this workflow by sending a POST request to the webhook URL:

```bash
curl -X POST \
  -u "vana_webhook:vana_webhook_password" \
  -H "Content-Type: application/json" \
  -d '{
    "entities": [
      {
        "name": "VANA",
        "type": "project",
        "observation": "VANA is a multi-agent system using Google ADK."
      }
    ]
  }' \
  http://localhost:5678/webhook/kg-sync
```

### Document Processing

You can test this workflow by sending a POST request to the webhook URL:

```bash
curl -X POST \
  -u "vana_webhook:vana_webhook_password" \
  -H "Content-Type: application/json" \
  -d '{
    "document_path": "/path/to/document.txt",
    "options": {
      "chunk_size": 1000,
      "chunk_overlap": 200,
      "extract_entities": true
    }
  }' \
  http://localhost:5678/webhook/document-processing
```
