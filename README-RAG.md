# VANA GitHub RAG Integration

This document explains how the GitHub RAG (Retrieval Augmented Generation) integration works in the VANA system.

## Overview

The VANA GitHub RAG integration enables agents to access knowledge stored in the GitHub repository using Vector Search. This allows agents to provide more accurate and context-aware responses based on the project's documentation and code.

## Architecture

The system consists of the following components:

1. **Knowledge Extraction**: Scripts that process GitHub repository files, extract text, and chunk it into manageable pieces.
2. **Embedding Generation**: Using Vertex AI to generate embeddings for text chunks.
3. **Vector Storage**: Storing embeddings in a Vector Search index for efficient retrieval.
4. **Knowledge Sync**: GitHub Actions workflow that keeps the knowledge base up-to-date.
5. **Knowledge Retrieval**: Tools that allow agents to search the knowledge base.

## Setup and Configuration

### Prerequisites

- Google Cloud Project with Vertex AI and Vector Search enabled
- GitHub repository with necessary secrets configured
- Service account with appropriate permissions

### Environment Variables

The following environment variables are required:

```
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=your-location
GOOGLE_STORAGE_BUCKET=your-bucket
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
VECTOR_SEARCH_INDEX_NAME=your-index-name
VECTOR_SEARCH_DIMENSIONS=768
DEPLOYED_INDEX_ID=your-deployed-index-id
```

### GitHub Secrets

The following secrets must be configured in the GitHub repository:

- GOOGLE_CLOUD_PROJECT
- GOOGLE_CLOUD_LOCATION
- GOOGLE_STORAGE_BUCKET
- GCP_SERVICE_ACCOUNT_KEY

## Usage

### Knowledge Sync

The knowledge sync workflow runs automatically when changes are pushed to the main branch or can be triggered manually from the Actions tab.

To trigger manually:
1. Go to the Actions tab in GitHub
2. Select the "Knowledge Sync" workflow
3. Click "Run workflow"
4. Configure the parameters (max files, file types)
5. Click "Run workflow" again

### Using the Search Tool

```python
from tools.search_knowledge_tool import search_knowledge_tool

# Search the knowledge base
results = search_knowledge_tool("What is the architecture of VANA?")
print(results)
```

### Testing Vector Search

```bash
# Run a direct test
python scripts/test_vector_search_direct.py --query "What is the architecture of VANA?"

# Run comprehensive tests
python scripts/comprehensive_vector_search_test.py

# Monitor RAG health
python scripts/monitor_rag_health.py
```

### Agent Integration

The agents have been configured to use the knowledge base. When an agent receives a query about the VANA system, it will search the knowledge base for relevant information.
