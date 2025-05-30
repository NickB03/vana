# Launch Configuration

This document provides a comprehensive guide to configuring and launching the VANA environment with the MCP Knowledge Graph and Vector Search integration.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Launch Script](#launch-script)
- [API Keys and Credentials](#api-keys-and-credentials)
- [Troubleshooting](#troubleshooting)

## Overview

The VANA environment consists of several components that need to be launched together:

1. **ADK Web Interface**: The web interface for interacting with the ADK agents.
2. **MCP Server**: The Model Context Protocol server for agent communication and Knowledge Graph integration.
3. **Vector Search**: The Vertex AI Vector Search service for semantic search capabilities.
4. **Knowledge Graph**: The MCP Knowledge Graph for structured knowledge representation.

The `launch_vana_with_mcp.sh` script automates the process of launching these components, making it easy to start the VANA environment with a single command.

## Prerequisites

Before launching the VANA environment, ensure that you have the following prerequisites installed:

- **Python 3.9+**: Required for the ADK web interface and Vector Search client.
- **Node.js v18.17.0**: Required for the MCP server.
- **Git**: Required for cloning the MCP server repository.
- **Google Cloud SDK**: Required for Vector Search integration.
- **Terminal**: The launch script uses Terminal.app on macOS to open new terminal windows.

## Environment Configuration

### Virtual Environment

The VANA environment uses a Python virtual environment to isolate dependencies. The virtual environment is created automatically by the launch script if it doesn't exist.

### Environment Variables

The following environment variables are used for configuration:

- `MCP_API_KEY`: API key for the MCP server
- `MCP_SERVER_URL`: URL of the MCP server (default: https://mcp.community.augment.co)
- `MCP_NAMESPACE`: Namespace for the Knowledge Graph (default: vana-project)
- `GOOGLE_CLOUD_PROJECT`: Google Cloud project ID
- `GOOGLE_CLOUD_LOCATION`: Google Cloud location (default: us-central1)
- `VECTOR_SEARCH_ENDPOINT_ID`: Vertex AI Vector Search endpoint ID
- `DEPLOYED_INDEX_ID`: Vertex AI Vector Search deployed index ID

These can be set in a `.env` file in the project root directory:

```bash
MCP_API_KEY=your_api_key_here
MCP_SERVER_URL=https://mcp.community.augment.co
MCP_NAMESPACE=vana-project
GOOGLE_CLOUD_PROJECT=your_gcp_project
GOOGLE_CLOUD_LOCATION=us-central1
VECTOR_SEARCH_ENDPOINT_ID=your_endpoint_id
DEPLOYED_INDEX_ID=your_deployed_index_id
```

### Augment Configuration

The `augment-config.json` file in the project root directory configures Augment to use the Knowledge Graph and Vector Search:

```json
{
  "version": "1.0",
  "knowledgeGraph": {
    "provider": "mcp",
    "config": {
      "serverUrl": "https://mcp.community.augment.co",
      "namespace": "vana-project",
      "apiKey": "${MCP_API_KEY}"
    }
  },
  "memory": {
    "enabled": true,
    "autoSave": true,
    "autoLoad": true,
    "providers": {
      "knowledge_graph": {
        "enabled": true,
        "config": {
          "server_url": "${MCP_SERVER_URL}",
          "namespace": "${MCP_NAMESPACE}",
          "api_key": "${MCP_API_KEY}"
        }
      },
      "vector_search": {
        "enabled": true,
        "config": {
          "project": "${GOOGLE_CLOUD_PROJECT}",
          "location": "${GOOGLE_CLOUD_LOCATION}",
          "endpoint_id": "${VECTOR_SEARCH_ENDPOINT_ID}",
          "deployed_index_id": "${DEPLOYED_INDEX_ID}"
        }
      }
    },
    "settings": {
      "default_provider": "hybrid",
      "sync_interval": 3600
    }
  },
  "chatHistory": {
    "import": {
      "enabled": true,
      "sources": ["claude"]
    }
  }
}
```

## Launch Script

The `launch_vana_with_mcp.sh` script automates the process of launching the VANA environment. It performs the following tasks:

1. Checks if the VANA directory exists
2. Creates a virtual environment if it doesn't exist
3. Checks if the required ports are available
4. Clones the MCP server repository if it doesn't exist
5. Creates the start-mcp-server.sh script if it doesn't exist
6. Starts the ADK web interface in a new terminal window
7. Starts the MCP server in a new terminal window
8. Opens the browser to the ADK web interface

### Usage

To use the launch script, simply run:

```bash
./launch_vana_with_mcp.sh
```

This will launch the VANA environment with the MCP Knowledge Graph and Vector Search integration.

### Configuration

The launch script can be configured by editing the following variables at the top of the script:

```bash
# Configuration
BASE_DIR="$HOME/Development/vana"
VENV_DIR="$BASE_DIR/.venv"
MCP_DIR="$BASE_DIR/mcp-servers/n8n-mcp"
ADK_WEB_PORT=8000
MCP_SERVER_PORT=3000
```

- `BASE_DIR`: The base directory of the VANA project
- `VENV_DIR`: The directory of the virtual environment
- `MCP_DIR`: The directory of the MCP server
- `ADK_WEB_PORT`: The port for the ADK web interface
- `MCP_SERVER_PORT`: The port for the MCP server

### Terminal Windows

The launch script opens two terminal windows:

1. **ADK Web Interface**: This terminal window runs the ADK web interface.
2. **MCP Server**: This terminal window runs the MCP server.

These terminal windows must remain open for the servers to continue running. If you close a terminal window, the corresponding server will stop.

## API Keys and Credentials

### MCP API Key

The MCP API key is required for accessing the MCP server and Knowledge Graph. You can obtain an API key by signing up for an account at [https://mcp.community.augment.co](https://mcp.community.augment.co).

### Google Cloud Credentials

The Google Cloud credentials are required for accessing Vertex AI Vector Search. You can obtain credentials by creating a service account in the Google Cloud Console and downloading the JSON key file.

To authenticate with Google Cloud, you can use the `gcloud` command-line tool:

```bash
gcloud auth login
gcloud config set project your_gcp_project
```

Alternatively, you can set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of the JSON key file:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

## Troubleshooting

### Launch Script Issues

- **VANA Directory Not Found**: If the launch script reports that the VANA directory is not found, check that the `BASE_DIR` variable is set correctly.
- **Virtual Environment Creation Failed**: If the virtual environment creation fails, check that Python 3.9+ is installed and that you have permission to create directories in the VANA directory.
- **Port Already in Use**: If a port is already in use, the launch script will warn you. You can either stop the process using that port or change the port in the launch script.

### ADK Web Interface Issues

- **ADK Web Interface Not Starting**: If the ADK web interface doesn't start, check that the virtual environment is activated and that the ADK package is installed.
- **ADK Web Interface Not Accessible**: If the ADK web interface is not accessible in the browser, check that the ADK web interface is running and that the port is correct.

### MCP Server Issues

- **MCP Server Not Starting**: If the MCP server doesn't start, check that Node.js v18.17.0 is installed and that the MCP server repository is cloned correctly.
- **MCP Server Not Accessible**: If the MCP server is not accessible, check that the MCP server is running and that the port is correct.

### Knowledge Graph Issues

- **Knowledge Graph Not Available**: If the Knowledge Graph is not available, check that the MCP server is running and that you have the correct API key.
- **Knowledge Graph Operations Failing**: If Knowledge Graph operations are failing, check that you have the correct namespace and that the MCP server is running correctly.

### Vector Search Issues

- **Vector Search Not Available**: If Vector Search is not available, check that you have the correct Google Cloud credentials and that the Vector Search index is deployed.
- **Vector Search Operations Failing**: If Vector Search operations are failing, check that you have the correct project, location, endpoint ID, and deployed index ID.

## Further Reading

- [knowledge-graph-integration.md](knowledge-graph-integration.md): Guide to integrating the Knowledge Graph
- [n8n-mcp-server-setup.md](n8n-mcp-server-setup.md): Guide to setting up the MCP server
- [vertex-ai-transition.md](vertex-ai-transition.md): Guide to transitioning from Ragie.ai to Vertex AI Vector Search
