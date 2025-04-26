# n8n Workflows for VANA Memory Management

This directory contains n8n workflow definitions for the VANA memory management system.

## Workflows

### 1. Manual Memory Save

**File**: `manual_memory_save.json`

This workflow is triggered by the `!rag` command and saves the current chat buffer to Ragie.

**Nodes**:
- **Webhook**: Receives the buffer data from the MCP interface
- **Check Memory Status**: Verifies that memory recording is active
- **Format For Ragie**: Formats the buffer data for the Ragie API
- **Upload to Ragie**: Sends the formatted data to Ragie
- **Response Handler**: Processes the response and creates a meaningful message

**Webhook Configuration**:
- **Path**: `/save-memory`
- **Method**: `POST`
- **Authentication**: Basic Auth

### 2. Daily Memory Sync

**File**: `daily_memory_sync.json`

This workflow runs on a schedule to sync recent chat logs to Ragie.

**Nodes**:
- **Schedule**: Triggers the workflow on a schedule
- **Get Recent Logs**: Retrieves recent chat logs
- **Format Logs for Ragie**: Formats the logs for the Ragie API
- **Upload to Ragie**: Sends the formatted data to Ragie
- **Log Result**: Logs the result of the upload

## Importing Workflows

To import these workflows into n8n:

1. Open n8n in your browser
2. Go to "Workflows" in the sidebar
3. Click "Import from File"
4. Select the workflow JSON file
5. Click "Import"

## Configuring Credentials

Both workflows require a Ragie API key. To configure this:

1. Go to "Credentials" in the sidebar
2. Click "New"
3. Select "HTTP Header Auth"
4. Enter a name (e.g., "Ragie API Key")
5. Enter the following details:
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_RAGIE_API_KEY`
6. Click "Save"

## Activating Workflows

After importing and configuring credentials:

1. Open the workflow
2. Click "Activate" in the top right
3. For the Manual Memory Save workflow, copy the webhook URL and update the `N8N_WEBHOOK_URL` environment variable

## Testing Workflows

### Manual Memory Save

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

### Daily Memory Sync

You can test this workflow by manually triggering it in the n8n interface.
