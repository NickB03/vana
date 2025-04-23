# GitHub Knowledge Sync

This directory contains scripts for synchronizing GitHub repository content with the Vector Search index. This enables agents to search and retrieve information from the codebase.

## Important Note

The current Vector Search index is configured without StreamUpdate enabled, which means it doesn't support direct updates through the API. To update the index, you need to:

1. Generate embeddings for the repository content
2. Export the embeddings to Google Cloud Storage
3. Use the Google Cloud Console or the Vector Search API to update the index with the new embeddings

The scripts in this directory demonstrate the process of generating embeddings and preparing them for upload, but the actual update operation may need to be performed through alternative methods.

## Scripts

### sync_knowledge.py

The main script for synchronizing repository content with Vector Search.

```bash
python scripts/github_sync/sync_knowledge.py [--repo-path PATH] [--file-types EXTENSIONS] [--exclude-dirs DIRS] [--max-files NUM] [--chunk-size SIZE] [--chunk-overlap OVERLAP]
```

Options:
- `--repo-path PATH`: Path to the repository root (default: current directory)
- `--file-types EXTENSIONS`: Comma-separated list of file extensions to process (default: .py,.md,.txt)
- `--exclude-dirs DIRS`: Comma-separated list of directories to exclude (default: .git,.github,__pycache__,node_modules,venv,.venv,env,build,dist,secrets)
- `--max-files NUM`: Maximum number of files to process (default: 1000)
- `--chunk-size SIZE`: Maximum size of text chunks in characters (default: 1000)
- `--chunk-overlap OVERLAP`: Overlap between chunks in characters (default: 100)

### test_sync.py

A test script for verifying the knowledge sync process with a small subset of files.

```bash
python scripts/github_sync/test_sync.py [--repo-path PATH] [--max-files NUM] [--query QUERY]
```

Options:
- `--repo-path PATH`: Path to the repository root (default: current directory)
- `--max-files NUM`: Maximum number of files to process (default: 5)
- `--query QUERY`: Test query to verify the sync (default: "How does the Vector Search integration work?")

## GitHub Actions Workflow

The knowledge sync process is automated through a GitHub Actions workflow defined in `.github/workflows/knowledge_sync.yml`. This workflow runs automatically on pushes to the main branch and can also be triggered manually.

### Manual Trigger

To manually trigger the knowledge sync workflow:

1. Go to the GitHub repository
2. Click on the "Actions" tab
3. Select the "Knowledge Sync" workflow
4. Click "Run workflow"
5. Optionally, customize the parameters:
   - Max files: Maximum number of files to process
   - File types: Comma-separated list of file extensions to process
6. Click "Run workflow"

## Environment Variables

The scripts require the following environment variables:

- `GOOGLE_CLOUD_PROJECT`: Google Cloud project ID
- `GOOGLE_CLOUD_LOCATION`: Google Cloud location (e.g., us-central1)
- `GOOGLE_STORAGE_BUCKET`: Google Cloud Storage bucket name
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to the service account key file
- `VECTOR_SEARCH_INDEX_NAME`: Name of the Vector Search index
- `VECTOR_SEARCH_DIMENSIONS`: Dimensions of the embeddings
- `DEPLOYED_INDEX_ID`: ID of the deployed index

These variables can be set in the `.env` file or as environment variables.

## Workflow

The knowledge sync process follows these steps:

1. Find all files of specified types in the repository
2. Read the content of each file
3. Split the content into chunks with overlap
4. Generate embeddings for each chunk using Vertex AI
5. Upload the embeddings to the Vector Search index

This ensures that the Vector Search index contains up-to-date information from the repository, enabling agents to search and retrieve relevant code snippets and documentation.
