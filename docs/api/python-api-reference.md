# Python API Reference (Core Tools)

[Home](../../index.md) > [API Reference](index.md) > Python API Reference

This document serves as an entry point for understanding the Python Application Programming Interfaces (APIs) of VANA's core tools, primarily located in the `tools/` directory. These tools provide the foundational functionalities of the VANA system.

## 1. Purpose

The Python API reference aims to provide developers working with or extending VANA with clear information on:
*   Key classes and their public methods.
*   Expected parameters and their types.
*   Return values and their structures.
*   Core functionalities exposed by each tool.

While detailed usage examples and conceptual guides are available in the [Guides section](../guides/index.md) and specific implementation details are in the [Implementation section](../implementation/index.md), this API reference focuses on the direct programmatic interface.

## 2. Core Tools Overview

The following are some of VANA's core tools for which Python API details are relevant:

*   **`VectorSearchClient` (`tools/vector_search/vector_search_client.py`)**
    *   **Purpose:** Interacts with Google Vertex AI Vector Search for embedding generation and semantic similarity searches.
    *   **Key Methods (Conceptual):** `__init__`, `generate_embeddings()`, `find_neighbors()`, `upsert_datapoints()`, `remove_datapoints()`.
    *   See [VectorSearchClient Usage Guide](../guides/vector-search-client-usage.md) and [VectorSearchClient Implementation](../implementation/vector-search-client.md).

*   **`DocumentProcessor` (`tools/document_processing/document_processor.py`)**
    *   **Purpose:** Parses various document formats, extracts text content, and uses `SemanticChunker` to divide text into manageable chunks.
    *   **Key Methods (Conceptual):** `__init__`, `process_document()`.
    *   See [DocumentProcessor Usage Guide](../guides/document-processor-usage.md) and [DocumentProcessor Implementation](../implementation/document-processing.md).

*   **`SemanticChunker` (`tools/document_processing/semantic_chunker.py`)**
    *   **Purpose:** Splits large texts into smaller, semantically relevant chunks.
    *   **Key Methods (Conceptual):** `__init__`, `chunk_text()`.
    *   Often used internally by `DocumentProcessor`.

*   **`KnowledgeGraphManager` (`tools/knowledge_graph/knowledge_graph_manager.py`)**
    *   **Purpose:** Manages interactions with an MCP-compatible Knowledge Graph server for storing and retrieving structured knowledge.
    *   **Key Methods (Conceptual):** `__init__`, `add_entity()`, `get_entity()`, `add_relation()`, `search_nodes()`.
    *   See [KnowledgeGraphManager Usage Guide](../guides/kg-manager-usage.md) and [KnowledgeGraphManager Implementation](../implementation/kg-manager.md).

*   **`WebSearchClient` (`tools/web_search_client.py`)**
    *   **Purpose:** Fetches real-time information from the web using Google Custom Search API.
    *   **Key Methods (Conceptual):** `__init__`, `search()`.
    *   See [WebSearchClient Usage Guide](../guides/web-search-usage.md) and [WebSearchClient Implementation](../implementation/web-search.md).

*   **`EnhancedHybridSearch` (`tools/enhanced_hybrid_search.py`)**
    *   **Purpose:** Orchestrates searches across Vector Search, Knowledge Graph, and Web Search, combining and ranking results.
    *   **Key Methods (Conceptual):** `__init__`, `search()`.
    *   See [EnhancedHybridSearch Usage Guide](../guides/hybrid-search-usage.md) and [EnhancedHybridSearch Implementation](../implementation/enhanced-hybrid-search.md).

*   **`VectorSearchHealthChecker` (`tools/vector_search/health_checker.py`)**
    *   **Purpose:** Performs diagnostic checks on the Vector Search integration.
    *   **Key Methods (Conceptual):** `__init__`, `perform_checks()`, `get_recommendations()`.
    *   See [VectorSearchHealthChecker Implementation](../implementation/vector-search-health-checker.md).

*   **Logging Utility (`tools/logging/logger.py`)**
    *   **Purpose:** Provides configured logger instances for consistent logging across VANA.
    *   **Key Methods (Conceptual):** `get_logger()`.
    *   See [Logging System Implementation](../implementation/logging-system.md).

*   **Resilience Utilities (e.g., `tools/monitoring/circuit_breaker.py`)**
    *   **Purpose:** Provides resilience patterns like Circuit Breakers.
    *   **Key Classes/Methods (Conceptual):** `CircuitBreaker` class with `execute()` method.
    *   See [Resilience Patterns Implementation](../implementation/resilience-patterns.md).

## 3. API Documentation Strategy

Currently, this document serves as a high-level index. Detailed API specifications (class/method signatures, parameters, return types) for each tool should ideally be:

1.  **Maintained in Docstrings:** Python docstrings within the source code of each tool (`tools/.../*.py`) are the primary source for detailed API information. These should follow a consistent format (e.g., reStructuredText, Google style).
2.  **Summarized in Implementation Documents:** The individual implementation documents (e.g., `vector-search-client.md`) already provide conceptual class structures and method descriptions. These should be kept aligned with the source code.
3.  **Future: Auto-Generated Documentation:**
    *   A long-term goal could be to use tools like **Sphinx** with extensions (e.g., `sphinx.ext.autodoc`, `sphinx.ext.napoleon` for Google/NumPy style docstrings) to automatically generate comprehensive API reference HTML pages from the docstrings in the `tools/` directory.
    *   If implemented, this `python-api-reference.md` page would then link to the root of the auto-generated Sphinx documentation.

## 4. How to Use This Reference

*   Identify the core tool you need to interact with from the list above.
*   Refer to its linked **Usage Guide** for practical examples and conceptual understanding.
*   Refer to its linked **Implementation Document** for more details on its internal structure and methods.
*   **For the most precise API details (exact method signatures, parameter names, types, return values), always consult the Python docstrings directly within the source code of the respective tool in the `tools/` directory.**

This approach aims to provide both user-friendly guides and accurate, maintainable API information for developers.
