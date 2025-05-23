# Troubleshooting Documentation

[Home](../index.md) > Troubleshooting

This section contains troubleshooting documentation for the VANA system.

## Contents

This section provides guidance for troubleshooting common problems encountered while setting up or using VANA.

-   **[Common Issues](common-issues.md):** General setup, configuration, and operational issues.
-   **[Vector Search Issues](vector-search-issues.md):** Problems specific to the Vertex AI Vector Search integration, including connectivity, indexing, and querying.
-   **[Knowledge Graph & MCP Issues](knowledge-graph-mcp-issues.md):** (Placeholder) Issues related to interacting with the Knowledge Graph via the MCP server.
-   **[Dashboard Issues](dashboard-issues.md):** (Placeholder) Problems related to the VANA Monitoring Dashboard (Flask API or Streamlit UI).

## General Troubleshooting Approach

When encountering an issue with VANA:
1.  **Consult the Logs:** Check the relevant application logs (see [Interpreting VANA Logs Guide](../guides/interpreting-logs.md)) for error messages and context.
2.  **Verify Configuration:** Ensure all necessary environment variables in your `.env` file are correctly set as per the [Configuration Guide](../../README.md#%EF%B8%8F-configuration) and specific tool requirements.
3.  **Check Prerequisites:** Confirm all prerequisites (Python version, external tools like Tesseract, GCP service account permissions, enabled APIs) are met ([Installation Guide](../guides/installation-guide.md)).
4.  **Isolate the Component:** Try to determine which VANA component or external service is causing the issue (e.g., `VectorSearchClient`, `DocumentProcessor`, Flask API, Streamlit UI, Vertex AI, MCP Server).
5.  **Refer to Specific Guides:** Check the detailed documentation for the component in question (Guides, Implementation, or Architecture sections).
6.  **Use Health Checks:** Utilize tools like `scripts/test_vector_search_health.py` for on-demand diagnostics of the Vector Search integration.

The documents linked above provide solutions and diagnostic steps for more specific problems.
