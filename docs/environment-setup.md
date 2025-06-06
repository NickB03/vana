# Environment Setup Guide

This guide explains how to set up the environment variables required for Project VANA.

## Overview

VANA requires several environment variables to function properly. These can be set in one of two ways:

1. **Project Root `.env` (Standard)**: Place the `.env` file in the project root directory.
2. **Secrets Directory (More Secure)**: Place the `.env` file in a `secrets` directory, which is typically in the `.gitignore` file.

## Required Environment Variables

The following environment variables are required for VANA to function properly:

### Google Cloud & Vertex AI Vector Search

```bash
# Google Cloud Project and location
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
GOOGLE_CLOUD_LOCATION=us-central1  # or your preferred region

# Vector Search settings
VECTOR_SEARCH_INDEX_ID=your_vector_search_index_id
VECTOR_SEARCH_ENDPOINT_ID=your_vector_search_endpoint_id
DEPLOYED_INDEX_ID=vanasharedindex  # or your custom deployed index ID
```

### Knowledge Graph MCP Integration

```bash
# MCP Knowledge Graph settings
MCP_API_KEY=your_mcp_api_key
MCP_NAMESPACE=vana-project
MCP_SERVER_URL=https://knowledge-graph-default.modelcontextprotocol.com
```

### Web Search Integration (New)

```bash
# Google Custom Search API settings
GOOGLE_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

### n8n Integration (Optional)

```bash
# n8n API settings
N8N_API_KEY=your_n8n_api_key
N8N_API_URL=http://localhost:5678/api/v1
N8N_WEBHOOK_URL=http://localhost:5678/webhook/vana
```

## Setting Up Environment Variables

### Option 1: Project Root `.env`

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit the file and add your values:
   ```bash
   nano .env
   ```

### Option 2: Secrets Directory (Recommended)

1. Create the secrets directory if it doesn't exist:
   ```bash
   mkdir -p secrets
   ```

2. Copy the example file to the secrets directory:
   ```bash
   cp .env.example secrets/.env
   ```

3. Edit the file and add your values:
   ```bash
   nano secrets/.env
   ```

## Google Service Account Key

If you're using a Google Cloud service account for authentication, you should place the service account key JSON file in the `secrets` directory:

```bash
# Place the service account key file in the secrets directory
cp your-service-account-key.json secrets/service-account-key.json
```

Then, set the environment variable to point to this file:

```bash
# Add this to your .env file
GOOGLE_APPLICATION_CREDENTIALS=secrets/service-account-key.json
```

## Verifying Setup

After setting up your environment variables, you can verify that they've been loaded correctly by running:

```bash
python scripts/verify_env.py
```

This script will check that all required variables are set and have the correct format.

## Google ADK Installation

VANA relies on the `google-adk` package for agent orchestration. Install it with the Vertex AI extras enabled:

```bash
pip install "google-adk[vertexai]"
```

You can confirm the installation by running:

```bash
python -c "from google.adk.run import Runner; print('ADK installed')"
```

## Recent Updates (April 2025)

- Added `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` for web search integration
- Updated `MCP_SERVER_URL` to use the community-hosted knowledge graph server
- Added verification for the new environment variables in `verify_env.py`

## Troubleshooting

If you encounter issues with environment variables:

1. Make sure you're running commands from the project root directory
2. Verify that the `.env` file is in the correct location
3. Check for typos in variable names
4. Ensure that the values are correctly formatted

For API key issues, you may need to regenerate the keys through the respective service dashboards.
