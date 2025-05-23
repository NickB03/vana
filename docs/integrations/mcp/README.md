# MCP (Model Context Protocol) Integration

[Home](../../index.md) > [Integrations](../index.md) > MCP Integration

This document details VANA's integration with the Model Context Protocol (MCP) for its Knowledge Graph (KG) functionalities. VANA uses an MCP-compatible server to store and retrieve structured knowledge.

## 1. Overview

VANA leverages the Model Context Protocol to interact with a Knowledge Graph. This allows the system, particularly the conceptual Vana Agent, to:
*   Store learned facts, entities, and relationships in a structured manner.
*   Query this structured knowledge to inform its reasoning, supplement search results, or recall past information.
*   Build a persistent, evolving knowledge base.

The primary VANA component responsible for this integration is the `KnowledgeGraphManager` (`tools/knowledge_graph/knowledge_graph_manager.py`).

## 2. Key VANA Component: `KnowledgeGraphManager`

*   **Purpose:** Acts as an abstraction layer between VANA's internal logic and the MCP server. It translates VANA's needs for KG operations into MCP-compliant API calls.
*   **Functionality:**
    *   Provides methods for adding, retrieving, updating, and deleting entities in the KG.
    *   Provides methods for adding, retrieving, and deleting relationships between entities.
    *   May offer search or query capabilities over the KG, depending on the features exposed by the underlying MCP server and `MCPClient`.
*   **Underlying Client:** The `KnowledgeGraphManager` typically uses a more generic `MCPClient` (e.g., `tools.mcp_memory_client.MCPMemoryClient` or a similar utility) to handle the actual HTTP requests to the MCP server.
*   For detailed usage, see [KnowledgeGraphManager Usage Guide](../../guides/kg-manager-usage.md).
*   For implementation details, see [KnowledgeGraphManager Implementation](../../implementation/kg-manager.md).

## 3. MCP Server

*   **Role:** The MCP server is the backend system that hosts the actual graph database and exposes an API compliant with the Model Context Protocol.
*   **Deployment:** VANA can be configured to connect to:
    *   A community-hosted MCP server (e.g., `https://mcp.community.augment.co`).
    *   A locally hosted MCP server (e.g., `http://localhost:5000`) for development and testing.
*   **Responsibilities (from VANA's perspective):**
    *   Persisting entities and relationships.
    *   Executing queries sent by the `MCPClient`.
    *   Managing namespaces to isolate data if the server hosts multiple projects.

## 4. Configuration Requirements

To integrate with an MCP server, VANA requires the following configurations, typically set in the `.env` file and accessed via `config.environment`:

*   `MCP_ENDPOINT`: The base URL of the MCP server.
    *   Example for development (if `USE_LOCAL_MCP=true`): `http://localhost:5000`
    *   Example for community server: `https://mcp.community.augment.co`
*   `MCP_NAMESPACE`: A namespace specific to VANA on the MCP server, to keep its data separate.
    *   Example: `vana-project`
*   `MCP_API_KEY`: An API key for authenticating VANA's requests to the MCP server.

## 5. Data Flow (Conceptual)

1.  **Store Operation (e.g., Agent learns a new fact):**
    *   The Vana Agent decides to store an entity "ProjectX" of type "Software" with an observation "Uses Python."
    *   Agent calls `KnowledgeGraphManager.add_entity(name="ProjectX", entity_type="Software", observations=["Uses Python"])`.
    *   `KnowledgeGraphManager` constructs the appropriate payload.
    *   `KnowledgeGraphManager` (via its `MCPClient`) sends a POST or PUT request to the configured `MCP_ENDPOINT` under the `MCP_NAMESPACE`, including the `MCP_API_KEY` for authentication.
    *   The MCP server processes the request and stores the entity.
2.  **Retrieve Operation (e.g., Agent needs info about "ProjectX"):**
    *   Agent calls `KnowledgeGraphManager.get_entity(name="ProjectX")`.
    *   `KnowledgeGraphManager` (via `MCPClient`) sends a GET request to the MCP server for the "ProjectX" entity within the VANA namespace.
    *   The MCP server retrieves and returns the entity data.
    *   `KnowledgeGraphManager` parses the response and returns it to the agent.

## 6. Role in Hybrid Search

The `KnowledgeGraphManager` is one of the data sources queried by `EnhancedHybridSearch`. When a hybrid search is performed:
*   `EnhancedHybridSearch` may formulate a query suitable for the KG (e.g., based on extracted keywords from the user's query).
*   It calls a search/query method on `KnowledgeGraphManager`.
*   The KG results (e.g., relevant entities or facts) are then combined with results from Vector Search and Web Search.

## 7. Resilience and Error Handling

*   Calls from `KnowledgeGraphManager` (or its `MCPClient`) to the MCP server should be protected by resilience patterns like Circuit Breakers to handle server unavailability or transient errors.
*   The `KnowledgeGraphManager` should implement error handling for API errors, network issues, or unexpected responses from the MCP server, logging issues appropriately.

This integration with MCP allows VANA to leverage the power of structured knowledge graphs for more sophisticated memory, reasoning, and information retrieval.
