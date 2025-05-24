# VANA System Architecture

[Home](../index.md) > Architecture

This section provides an overview of the VANA system architecture, detailing its core components and how they interact. VANA has evolved into a suite of AI-powered services with a focus on robust knowledge management and system monitoring.

## Contents

-   **[System Overview](overview.md)**: A high-level view of the current VANA architecture, including the conceptual single agent, core tools, and the monitoring dashboard.
-   **[Agent Core Architecture](agent-core.md)**: Detailed architecture of the VANA agent core, including task execution, tool integration, memory components, and CLI interface.
-   **[Vector Search Monitoring System Architecture](vector_search_monitoring.md)**: Detailed architecture of the monitoring system, including the Flask API backend, Streamlit frontend UI, health checker, and scheduled monitor.
-   **[Document Processing Strategy](../document-processing-strategy.md)**: Outlines VANA's strategy for document parsing, chunking, and preparation for ingestion, covering current methods and planned enhancements with Vertex AI Document AI.
-   **[Knowledge Graph Integration Architecture](knowledge_graph_integration.md)**: How VANA integrates with an MCP-based Knowledge Graph for structured data.
-   **[Hybrid Search Architecture](hybrid_search.md)**: Design of the system that combines results from Vector Search, Knowledge Graph, and Web Search.
-   **[Security Overview](security_overview.md)**: Overview of security measures, credential management, and access control within VANA.
-   **[Configuration Management Architecture](configuration_management.md)**: How environment-specific configurations are handled via `.env` files and `config/environment.py`.

## Core Architectural Principles

-   **Modularity:** Key functionalities are encapsulated in distinct tools and services (primarily within the `tools/` directory and `agent/tools/` directory).
-   **API-Driven Dashboard:** The monitoring dashboard utilizes a Flask backend API for data retrieval and a Streamlit frontend for presentation.
-   **Service-Oriented Approach:** Components like `VectorSearchClient`, `KnowledgeGraphManager`, etc., act as internal services.
-   **Configurability:** System behavior and endpoints are managed through environment variables.
-   **Observability:** Built-in health checking and monitoring for critical components like Vector Search.
-   **Tool-Based Agent Architecture:** The VANA agent is built around a modular tool system, where each tool provides specific functionality that the agent can use to perform tasks.
-   **Memory Integration:** The agent integrates with short-term memory, memory bank, and knowledge graph components to maintain context and access persistent knowledge.
-   **CLI Interface:** The agent provides a flexible command-line interface with interactive, web UI, and single message modes.

Refer to the linked pages for detailed diagrams and explanations of each architectural aspect.
