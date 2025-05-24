# GitHub RAG Integration Workflow

This document describes the workflow for integrating GitHub repository content with Vector Search for knowledge retrieval.

## Overview

The GitHub RAG (Retrieval-Augmented Generation) integration allows VANA agents to search and retrieve information from the codebase. It consists of the following components:

1. **GitHub Actions Workflow**: Automatically syncs repository content with Vector Search
2. **Knowledge Sync Scripts**: Process repository files and generate embeddings
3. **Vector Search Integration**: Stores and retrieves embeddings from the Vector Search index
4. **Agent Knowledge Tools**: Allows agents to query the knowledge base

## GitHub Actions Workflow

The GitHub Actions workflow is defined in `.github/workflows/knowledge_sync.yml`. It runs automatically on pushes to the main branch and can also be triggered manually.

### Workflow Steps

1. Checkout the repository
2. Set up Python
3. Install dependencies
4. Process repository files
5. Generate embeddings
6. Update the Vector Search index
7. Verify the update

### Manual Trigger

To manually trigger the workflow:

1. Go to the GitHub repository
2. Click on the "Actions" tab
3. Select the "Knowledge Sync" workflow
4. Click "Run workflow"
5. Customize the parameters if needed
6. Click "Run workflow"

## Performance Considerations

- Each Vector Search query takes approximately 8-9 seconds on a stable connection
- The embedding generation process is cached to improve performance
- Batch updates are used to efficiently update the Vector Search index

## Troubleshooting

If the workflow fails, check the following:

1. Ensure the GitHub secrets are correctly configured
2. Verify the service account has the necessary permissions
3. Check the logs for specific error messages
4. Run the `scripts/test_vector_search_direct.py` script to test Vector Search directly

## ADK Fallback Mechanism

The integration includes a fallback mechanism for when the ADK (Agent Development Kit) is not available or encounters issues:

1. The `tools/adk_wrapper.py` module attempts to import ADK through multiple strategies
2. If ADK is not available, it creates an `AgentProxy` that uses direct Vector Search
3. This ensures that agents can still access knowledge even when ADK is not working properly

### Testing the Fallback Mechanism

To test the fallback mechanism:

```bash
python tools/adk_wrapper.py --verbose
```

This will show which import strategy succeeded or if the fallback mechanism was used.
