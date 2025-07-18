# VANA Scripts

This directory contains scripts for the VANA project.

## Table of Contents

1. [Setup n8n Workflows](#setup-n8n-workflows)
2. [Test Workflow Interface](#test-workflow-interface)

## Setup n8n Workflows

The `setup_n8n_workflows.py` script sets up the n8n workflows for the VANA project.

### Usage

```bash
python scripts/setup_n8n_workflows.py [options]
```

### Options

- `--n8n-url`: n8n URL (e.g., http://localhost:5678)
- `--n8n-username`: n8n username
- `--n8n-password`: n8n password
- `--vector-search-api-url`: Vector Search API URL
- `--vector-search-api-key`: Vector Search API key
- `--mcp-server-url`: MCP server URL
- `--mcp-api-key`: MCP API key
- `--mcp-namespace`: MCP namespace
- `--webhook-username`: Webhook username
- `--webhook-password`: Webhook password
- `--workflows-dir`: Directory containing workflow JSON files (default: n8n-workflows)
- `--env-file`: Path to .env file to update (default: .env)
- `--skip-env-update`: Skip updating the .env file

### Example

```bash
python scripts/setup_n8n_workflows.py \
  --n8n-url http://localhost:5678 \
  --n8n-username admin \
  --n8n-password password \
  --vector-search-api-url https://api.vector-search.example.com \
  --vector-search-api-key your-vector-search-api-key \
  --mcp-server-url https://mcp.community.augment.co \
  --mcp-api-key your-mcp-api-key \
  --mcp-namespace vana-project \
  --webhook-username vana_webhook \
  --webhook-password vana_webhook_password
```

### What it does

1. Checks if n8n is available at the specified URL
2. Creates credentials in n8n for Vector Search API, MCP API, and Webhook Auth
3. Creates environment variables in n8n for Vector Search API URL, MCP server URL, and MCP namespace
4. Imports workflows from the specified directory
5. Activates the imported workflows
6. Updates the .env file with webhook URLs

## Test Workflow Interface

The `test_workflow_interface.py` script tests the WorkflowInterface with real data.

### Usage

```bash
python scripts/test_workflow_interface.py [test_name]
```

### Test Names

- `memory_save`: Test the memory_save workflow
- `memory_sync`: Test the memory_sync workflow
- `knowledge_graph_sync`: Test the knowledge_graph_sync workflow
- `document_processing`: Test the document_processing workflow
- `all`: Run all tests

### Example

```bash
python scripts/test_workflow_interface.py memory_save
```

### What it does

1. Creates a WorkflowInterface instance
2. Checks if n8n is available
3. Runs the specified test(s)
4. Logs the results

### Requirements

Before running the tests, make sure you have:

1. Set up the n8n workflows using the `setup_n8n_workflows.py` script
2. Updated the .env file with the required environment variables
3. Installed the required dependencies

### Environment Variables

The test script uses the following environment variables:

- `N8N_WEBHOOK_URL`: URL of the n8n server
- `N8N_WEBHOOK_USERNAME`: Username for n8n webhook authentication
- `N8N_WEBHOOK_PASSWORD`: Password for n8n webhook authentication
- `MEMORY_CACHE_SIZE`: Size of the memory cache (default: 1000)
- `MEMORY_CACHE_TTL`: TTL for memory cache entries in seconds (default: 3600)
- `ENTITY_HALF_LIFE_DAYS`: Half-life for entity relevance in days (default: 30)
- `VECTOR_SEARCH_WEIGHT`: Weight for Vector Search results (default: 0.7)
- `KNOWLEDGE_GRAPH_WEIGHT`: Weight for Knowledge Graph results (default: 0.3)
- `GOOGLE_CLOUD_PROJECT`: Google Cloud project ID
- `GOOGLE_CLOUD_LOCATION`: Google Cloud location (default: us-central1)
- `VECTOR_SEARCH_ENDPOINT_ID`: Vector Search endpoint ID
- `DEPLOYED_INDEX_ID`: Deployed index ID
- `MCP_API_KEY`: MCP API key
- `MCP_SERVER_URL`: MCP server URL (default: https://mcp.community.augment.co)
- `MCP_NAMESPACE`: MCP namespace (default: vana-project)
