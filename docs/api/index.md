# VANA API Reference

[Home](../../index.md) > API Reference

Welcome to the VANA API reference documentation. This section provides details on the various APIs exposed by VANA components, as well as guidance on how to interact with VANA's core tools programmatically (Python API).

## Available API Documentation

*   **[Dashboard Flask API Endpoints](flask-api-endpoints.md):**
    Detailed documentation for the RESTful API endpoints provided by the VANA Monitoring Dashboard's Flask backend (`dashboard/flask_app.py`). This API is primarily consumed by the Streamlit frontend UI but can also be used by other clients for accessing health status, metrics, and other monitoring data related to the Vector Search system.

*   **[Python API Reference (Core Tools)](python-api-reference.md):**
    This section (or linked documents) will provide an overview of the public Python APIs of VANA's core tools located in the `tools/` directory. This includes programmatic usage of:
    *   `VectorSearchClient`
    *   `DocumentProcessor`
    *   `KnowledgeGraphManager`
    *   `WebSearchClient`
    *   `EnhancedHybridSearch`
    *   And other key utilities.
    *(Note: Detailed usage guides for these tools are also available in the [Guides section](../guides/index.md). This API reference will focus more on class and method signatures, parameters, and return types, potentially generated or summarized from docstrings in the future).*

## Future API Documentation

As VANA evolves, this section may include documentation for:
*   APIs exposed by a VANA agent (if it offers an external interface).
*   APIs for other VANA services or tools that might be developed.

Please navigate to the specific documents linked above for detailed API information.
