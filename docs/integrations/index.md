# Integrations Documentation

[Home](../index.md) > Integrations

This section contains documentation for external integrations used by the VANA system.

## Contents

This section details how VANA integrates with key external systems and services that are crucial for its functionality.

-   **[Google Cloud Vertex AI Integration](vertex-ai/README.md):**
    Covers VANA's use of Vertex AI services, including:
    *   Vector Search for semantic similarity search.
    *   Text Embedding models for generating vector representations.
    *   Document AI (planned) for advanced document parsing.

-   **[MCP (Model Context Protocol) Integration](mcp/README.md):**
    Details how VANA interacts with an MCP-compatible server for its Knowledge Graph capabilities, enabling structured data storage and retrieval.

-   **[Google Custom Search API Integration](google-custom-search.md):** (New placeholder link)
    Explains the integration with Google Custom Search API for real-time web search capabilities used by the `WebSearchClient`.

*(Note: Documentation for `n8n` and `Agent Engine` integrations have been archived as these systems are no longer part of the core VANA architecture.)*

## Overview

VANA relies on several key external services to provide its advanced AI capabilities. This section provides documentation on how these integrations are configured, implemented, and utilized within the VANA ecosystem. Understanding these integrations is essential for both using and developing VANA.

## Key Current Integrations

-   **Google Cloud Vertex AI:**
    *   **Vector Search:** For storing and searching text embeddings.
    *   **Embedding Models:** For converting text to vector representations (e.g., `text-embedding-004`).
    *   **Document AI (Planned):** For advanced parsing of various document formats.
-   **MCP (Model Context Protocol) Server:**
    *   Used by `KnowledgeGraphManager` for creating, querying, and managing structured knowledge in a graph database.
-   **Google Custom Search API:**
    *   Used by `WebSearchClient` to perform live web searches and retrieve up-to-date information.
