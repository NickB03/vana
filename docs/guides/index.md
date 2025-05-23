# User and Developer Guides

[Home](../index.md) > Guides

This section provides practical, step-by-step guides for setting up, configuring, using, and operating various components of the VANA system.

## Contents

### I. Setup & Configuration
-   **[Installation Guide](installation-guide.md)**: Step-by-step instructions for setting up the VANA project, including environment setup and dependencies.
-   **[Configuring Web Search](web-search-configuration.md)**: How to set up API keys and engine IDs for Google Custom Search integration.
    *   For general VANA configuration using `.env` files, see the Installation Guide and [Configuration System Implementation](../implementation/config-environment.md).

### II. Using the VANA Agent
-   **[Agent Usage Guide](agent-usage.md)**: Overview of the VANA agent and its capabilities.
-   **[Agent CLI Guide](agent-cli-guide.md)**: Using the command-line interface for the VANA agent.
-   **[Agent Demo Guide](agent-demo.md)**: Running and understanding the VANA agent demo.
-   **[Agent Tool Usage Guide](agent-tool-usage.md)**: Using the various tools available in the VANA agent.

### III. Using Core VANA Services & Tools
-   **Monitoring Dashboard:**
    -   [Running the VANA Monitoring Dashboard](running-dashboard.md): How to start the Flask API and Streamlit UI.
    -   [VANA Monitoring Dashboard User Guide](dashboard-guide.md): Navigating and understanding the dashboard.
    -   [Interpreting Vector Search Health Reports](vector-search-health-reports.md): Understanding the health status and metrics for Vector Search.
    -   [API Security Guide](api-security.md): Authentication and authorization for API endpoints.
-   **Vector Search:**
    -   [VectorSearchClient Usage Guide](vector-search-client-usage.md): Programmatic interaction with Vertex AI Vector Search.
-   **Document Processing:**
    -   [DocumentProcessor Usage Guide](document-processor-usage.md): Using the tool for parsing documents and extracting text.
    -   [Preparing Documents for Ingestion](preparing-documents-ingestion.md): Best practices for document preparation.
-   **Knowledge Graph:**
    -   [KnowledgeGraphManager Usage Guide](kg-manager-usage.md): Interacting with the MCP Knowledge Graph.
    -   [Conceptual Knowledge Graph Commands](knowledge-graph-commands.md): High-level commands for KG operations (e.g., for agent use).
-   **Hybrid Search:**
    -   [EnhancedHybridSearch Usage Guide](hybrid-search-usage.md): Using the tool that combines multiple search sources.
-   **Web Search:**
    -   [WebSearchClient Usage Guide](web-search-usage.md): Programmatic interaction with Google Custom Search.

### IV. Operational Guides
-   [Running Scheduled Tasks](scheduled-tasks.md): Setting up and managing automated tasks like the Vector Search health monitor.
-   [Interpreting VANA Logs](interpreting-logs.md): Finding, reading, and understanding system logs.

### V. Development Guides
-   **[VANA Development Overview](../development/index.md)**: Entry point for developer-specific documentation.
-   [Adding a New Tool to VANA](adding-new-tool.md): Process and considerations for extending VANA with new tools.
-   [Extending the VANA Monitoring Dashboard](extending-dashboard.md): How to add new views or functionalities to the dashboard.
-   [Security Integration Guide](security-integration.md): Guidance on security principles and components in VANA.

*This index provides links to key guides. For architectural details, see the [Architecture section](../architecture/index.md), and for implementation specifics, see the [Implementation section](../implementation/index.md).*
