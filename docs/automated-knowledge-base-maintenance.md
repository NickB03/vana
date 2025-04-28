# Automated Knowledge Base Maintenance

This document describes the automated knowledge base maintenance system for VANA. The system uses GitHub Actions to automatically update the knowledge base when new documents are added or existing documents are modified.

## Overview

The automated knowledge base maintenance system consists of several components:

1. **GitHub Actions Workflow**: Automates the knowledge base update process
2. **Document Processing Pipeline**: Processes documents for knowledge base integration
3. **Verification Scripts**: Ensures the knowledge base is functioning correctly
4. **Notification System**: Alerts administrators of any issues

The system is designed to minimize manual effort while ensuring the knowledge base remains up-to-date and high-quality.

## GitHub Actions Workflow

The GitHub Actions workflow is defined in `.github/workflows/knowledge-base-update.yml`. It is triggered by:

- Pushes to the `main` branch that modify files in the `docs/` or `knowledge/` directories
- A weekly schedule (Sunday at midnight)
- Manual triggering through the GitHub Actions interface

The workflow performs the following steps:

1. Checkout the repository
2. Set up Python
3. Install dependencies
4. Authenticate to Google Cloud
5. Find changed knowledge files
6. Process changed files
7. Verify Vector Search index
8. Test Knowledge Graph connection
9. Run search quality evaluation
10. Upload search quality report
11. Send notification on failure

## Document Processing Pipeline

The document processing pipeline is implemented in `scripts/expand_knowledge_base.py`. It processes documents for integration into the knowledge base:

1. **Document Registry**: Tracks processed documents to avoid duplicates
2. **Metadata Extraction**: Extracts metadata from documents
3. **Semantic Chunking**: Divides documents into semantic chunks
4. **Entity Extraction**: Identifies entities in documents
5. **Vector Search Upload**: Uploads document chunks to Vector Search
6. **Knowledge Graph Upload**: Uploads entities to Knowledge Graph

The pipeline supports various document formats and includes advanced features like semantic chunking and entity extraction.

## Verification Scripts

Several scripts verify that the knowledge base is functioning correctly:

### Vector Search Verification

The `scripts/verify_vector_search.py` script verifies that the Vector Search index is properly configured and accessible:

1. Checks that the index exists and is accessible
2. Verifies that the endpoint is configured correctly
3. Performs a test search to ensure functionality
4. Reports any issues

### Knowledge Graph Verification

The `scripts/test_mcp_connection.py` script verifies that the Knowledge Graph is properly configured and accessible:

1. Tests connection to the MCP Knowledge Graph server
2. Verifies API key, namespace, and server URL
3. Creates and deletes a test entity
4. Reports any issues

### Search Quality Evaluation

The `scripts/evaluate_search_quality.py` script evaluates the quality of search results:

1. Tests various query types
2. Compares different search implementations
3. Calculates quality metrics
4. Generates a comprehensive report

## Notification System

The workflow includes a notification system that alerts administrators of any issues:

1. Uses the `rtCamp/action-slack-notify` action to send Slack notifications
2. Triggered on workflow failure
3. Includes detailed error information
4. Provides a link to the workflow run

## Usage

### Manual Triggering

To manually trigger the knowledge base update workflow:

1. Go to the GitHub repository
2. Click on the "Actions" tab
3. Select the "Knowledge Base Update" workflow
4. Click "Run workflow"
5. Select the branch to run the workflow on
6. Click "Run workflow"

### Adding New Documents

To add new documents to the knowledge base:

1. Add the documents to the `docs/` or `knowledge/` directory
2. Commit and push the changes to the `main` branch
3. The workflow will automatically process the new documents

### Monitoring

To monitor the knowledge base update workflow:

1. Go to the GitHub repository
2. Click on the "Actions" tab
3. Select the "Knowledge Base Update" workflow
4. View the latest workflow runs

### Search Quality Reports

The workflow generates a search quality report that is uploaded as an artifact. To view the report:

1. Go to the GitHub repository
2. Click on the "Actions" tab
3. Select the "Knowledge Base Update" workflow
4. Click on the latest workflow run
5. Scroll down to the "Artifacts" section
6. Download the "search-quality-report" artifact

## Configuration

### Environment Variables

The workflow uses the following environment variables:

| Variable | Description |
|----------|-------------|
| GOOGLE_CLOUD_PROJECT | Google Cloud project ID |
| GOOGLE_CLOUD_LOCATION | Google Cloud location |
| GOOGLE_STORAGE_BUCKET | Google Cloud Storage bucket |
| VECTOR_SEARCH_INDEX_ID | Vector Search index ID |
| VECTOR_SEARCH_ENDPOINT_ID | Vector Search endpoint ID |
| DEPLOYED_INDEX_ID | Deployed index ID |
| MCP_API_KEY | MCP API key |
| MCP_NAMESPACE | MCP namespace |
| MCP_SERVER_URL | MCP server URL |

These variables are stored as GitHub secrets and are automatically injected into the workflow.

### GitHub Secrets

The following GitHub secrets are required:

| Secret | Description |
|--------|-------------|
| GOOGLE_CLOUD_PROJECT | Google Cloud project ID |
| GOOGLE_CLOUD_LOCATION | Google Cloud location |
| GOOGLE_STORAGE_BUCKET | Google Cloud Storage bucket |
| VECTOR_SEARCH_INDEX_ID | Vector Search index ID |
| VECTOR_SEARCH_ENDPOINT_ID | Vector Search endpoint ID |
| DEPLOYED_INDEX_ID | Deployed index ID |
| MCP_API_KEY | MCP API key |
| GCP_SERVICE_ACCOUNT_KEY | Google Cloud service account key |
| SLACK_WEBHOOK | Slack webhook URL for notifications |

## Document Processing Options

The `expand_knowledge_base.py` script supports the following options:

| Option | Description |
|--------|-------------|
| --input-file | Input file to process |
| --input-dir | Input directory to process |
| --output-dir | Output directory for processed documents |
| --chunk-size | Maximum chunk size in characters |
| --chunk-overlap | Overlap between chunks in characters |
| --upload | Upload processed documents to the knowledge base |
| --verbose | Print verbose output |

## Best Practices

### Document Organization

Organize documents in a logical structure:

- Use the `docs/` directory for documentation
- Use the `knowledge/` directory for knowledge base content
- Use subdirectories for different topics
- Use consistent file naming conventions

### Document Format

Format documents for optimal processing:

- Use Markdown for structured content
- Include clear headings and sections
- Use consistent formatting
- Include metadata where appropriate

### Workflow Optimization

Optimize the workflow for efficiency:

- Process files in batches to avoid rate limits
- Use incremental updates when possible
- Verify system health after updates
- Monitor workflow performance

## Troubleshooting

### Common Issues

#### Workflow Failure

If the workflow fails:

1. Check the workflow logs for error messages
2. Verify that all required secrets are configured
3. Check that the service account has the necessary permissions
4. Verify that the Vector Search index and endpoint exist
5. Check that the MCP Knowledge Graph server is accessible

#### Document Processing Failure

If document processing fails:

1. Check the document format
2. Verify that the document is accessible
3. Check for any special characters or formatting issues
4. Try processing the document manually

#### Verification Failure

If verification fails:

1. Check the verification logs for error messages
2. Verify that the Vector Search index is accessible
3. Check that the MCP Knowledge Graph server is accessible
4. Verify that the service account has the necessary permissions

## Conclusion

The automated knowledge base maintenance system provides a comprehensive solution for keeping the knowledge base up-to-date with minimal manual effort. By leveraging GitHub Actions, the system automates the entire process from document processing to verification, ensuring that the knowledge base remains high-quality and accessible.
