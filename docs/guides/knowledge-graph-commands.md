# Using the Knowledge Graph in VANA (Conceptual Commands)

[Home](../../index.md) > [Guides](./index.md) > Knowledge Graph Usage

This document outlines conceptual commands and interactions for working with VANA's Knowledge Graph (KG). The KG provides structured storage and retrieval of information using entities and relationships, accessed via the `KnowledgeGraphManager` which communicates with an MCP server.

## Overview

The commands described here (e.g., `!kg_query`, `!kg_store`) represent a potential high-level interface that a VANA agent or a specialized command-line tool might provide to users or other system components. These commands would be translated into programmatic calls to the `KnowledgeGraphManager`'s methods (e.g., `add_entity`, `get_entity`, `add_relation`, `search_nodes`).

For details on the `KnowledgeGraphManager` itself, see:
*   [KnowledgeGraphManager Usage Guide](kg-manager-usage.md)
*   [Knowledge Graph Manager Implementation](../implementation/kg-manager.md)

## Conceptual Command Reference

The following `!`-prefixed commands illustrate how one might interact with the KG through a VANA agent or tool.

### Query Commands

#### `!kg_query [entity_type] <query_terms>`
*   **Purpose:** Search for entities in the Knowledge Graph.
*   **Parameters:**
    *   `entity_type` (optional): Filter by a specific entity type (e.g., "project", "technology", "person"). If omitted or `*`, search all types.
    *   `query_terms`: Keywords or phrases to search for in entity names or observations.
*   **Underlying Logic:** Would likely call `KnowledgeGraphManager.search_nodes(query=query_terms, entity_type_filter=entity_type)`.
*   **Examples:**
    ```
    !kg_query project VANA
    !kg_query technology "Vector Search"
    !kg_query * knowledge management
    ```
*   **Conceptual Response:**
    ```
    Found 3 entities matching "VANA":
    1. VANA (project)
       Observations: "VANA is a suite of AI services..."
    2. VANA Architecture (concept)
       Observations: "The VANA architecture consists of..."
    ```

### Storage Commands

#### `!kg_store <entity_name> <entity_type> <"observation text">`
*   **Purpose:** Store a new entity or update an existing entity with an observation.
*   **Parameters:**
    *   `entity_name`: Name of the entity.
    *   `entity_type`: Type of the entity.
    *   `"observation text"`: The information to store about the entity (enclose in quotes if it contains spaces).
*   **Underlying Logic:** Would call `KnowledgeGraphManager.add_entity(name=entity_name, entity_type=entity_type, observations=[observation_text])`. If the entity exists, it might update observations.
*   **Examples:**
    ```
    !kg_store VANA project "VANA is a suite of AI services focused on knowledge management."
    !kg_store "HybridSearchTool" technology "Combines vector, KG, and web search."
    ```
*   **Conceptual Response:**
    ```
    Entity "VANA" (project) stored/updated with observation.
    ```

### Relationship Commands

#### `!kg_relate <from_entity_name> <relation_type> <to_entity_name>`
*   **Purpose:** Create a directed relationship between two entities.
*   **Parameters:**
    *   `from_entity_name`: The name of the source entity.
    *   `relation_type`: The type of relationship (e.g., "uses", "contains", "developedBy").
    *   `to_entity_name`: The name of the target entity.
*   **Underlying Logic:** Would call `KnowledgeGraphManager.add_relation(from_entity=from_entity_name, to_entity=to_entity_name, relation_type=relation_type)`. Assumes entities exist or handles their creation.
*   **Examples:**
    ```
    !kg_relate VANA uses "VectorSearchClient"
    !kg_relate "EnhancedHybridSearch" partOf VANA
    ```
*   **Conceptual Response:**
    ```
    Relationship created: VANA [uses] VectorSearchClient.
    ```

### Context & Exploration Commands (Conceptual)

#### `!kg_get <entity_name>`
*   **Purpose:** Show detailed information about a specific entity, including its type, observations, and direct relationships.
*   **Underlying Logic:** Calls `KnowledgeGraphManager.get_entity(name=entity_name)`.
*   **Example:**
    ```
    !kg_get VANA
    ```
*   **Conceptual Response:**
    ```
    Entity: VANA
    Type: project
    Observations:
    - VANA is a suite of AI services...
    Relationships (Outgoing):
    - uses: VectorSearchClient
    - uses: KnowledgeGraphManager
    Relationships (Incoming):
    - partOf: EnhancedHybridSearch
    ```

#### `!kg_expand <entity_name> [depth]`
*   **Purpose:** Show an entity and its relationships, expanded to a certain depth.
*   **Parameters:**
    *   `entity_name`: Name of the entity to expand.
    *   `depth` (optional): How many levels of relationships to traverse (default: 1).
*   **Underlying Logic:** This is a more complex query. It would involve recursively calling `KnowledgeGraphManager.get_entity()` or a specialized graph traversal method if available via `KnowledgeGraphManager` or the MCP server.
*   **Example:**
    ```
    !kg_expand VANA 1 
    ```
*   **Conceptual Response:**
    ```
    Expansion for "VANA" (depth 1):
    - VANA [uses] VectorSearchClient
    - VANA [uses] KnowledgeGraphManager
    - EnhancedHybridSearch [partOf] VANA 
    ```

### Hybrid Search Command (Conceptual)

#### `!hybrid_search <query_text>`
*   **Purpose:** Perform a hybrid search using `EnhancedHybridSearch`, which queries Vector Search, Knowledge Graph (via `KnowledgeGraphManager`), and Web Search.

*   **Parameters:**
    *   `query_text`: The search query.
*   **Underlying Logic:** Calls `EnhancedHybridSearch.search(query_text=query_text)`.
*   **Example:**
    ```
    !hybrid_search "How does VANA store knowledge?"
    ```
*   **Conceptual Response:** A ranked list combining results from Vector Search, KG, and Web Search.
    ```
    Hybrid Search Results:
    1. [KG] VANA (project) - "VANA uses Knowledge Graph for structured data..." (Score: 0.95)
    2. [VS] chunk_id_123 - "Vector Search stores embeddings of document chunks..." (Score: 0.92)
    3. [WEB] www.example.com/info - "VANA's approach to knowledge..." (Score: 0.88)
    ```

## Error Handling by Agent/Tool Interface

The agent or tool interpreting these `!` commands would be responsible for:
*   Parsing the command and its arguments.
*   Calling the appropriate `KnowledgeGraphManager` or `EnhancedHybridSearch` methods.
*   Handling exceptions returned by these methods (e.g., entity not found, MCP server connection issues, API errors).
*   Formatting the results or error messages for the user.
*   Example error response from the agent/tool:
    ```
    Error: Entity "VANAA" not found in Knowledge Graph. Did you mean "VANA"?
    ```
    Or:
    ```
    Error: Could not connect to MCP Knowledge Graph server. Please check configuration and server status.
    ```

## Best Practices for KG Interaction

1.  **Consistent Entity Naming:** Use clear and consistent names for entities.
2.  **Defined Entity Types:** Adhere to a predefined set of entity types relevant to VANA's domain (e.g., "project", "technology", "person", "document_chunk").
3.  **Meaningful Observations:** Store concise, informative observations with entities.
4.  **Relevant Relationships:** Create relationships that accurately model the connections between entities.
5.  **Regular Audits (Manual/Automated):** Periodically query the KG to verify data integrity and relevance.
6.  **Leverage Hybrid Search:** For complex information needs, use hybrid search to combine structured KG data with semantic and web search.

## Troubleshooting KG Interactions

If commands related to the Knowledge Graph fail or return unexpected results:

1.  **Check MCP Server Status:** Ensure the configured MCP server (local or remote) is running and accessible from the VANA environment.
2.  **Verify `KnowledgeGraphManager` Configuration:**
    *   Confirm that `MCP_ENDPOINT`, `MCP_NAMESPACE`, and `MCP_API_KEY` are correctly set in your `.env` file. These are used by `config/environment.py`, which in turn configures `KnowledgeGraphManager`.
    *   Ensure the `MCP_NAMESPACE` matches the one you intend to use on the MCP server.
3.  **Test `KnowledgeGraphManager` Directly:** If you suspect issues with the `!` command interface, try using the `KnowledgeGraphManager` methods directly in a Python script to isolate problems (see [KnowledgeGraphManager Usage Guide](kg-manager-usage.md)).
4.  **Inspect Logs:** Check VANA's application logs (e.g., `logs/vana_app.log` or console output) for errors from `KnowledgeGraphManager` or its underlying `MCPClient`. These logs might contain details about HTTP errors or MCP server responses. See [Interpreting VANA Logs Guide](interpreting-logs.md).
5.  **Check Entity/Relationship Existence:** Use basic query commands (like `!kg_get <entity_name>`) to verify that the entities or relationships you are trying to operate on actually exist as expected.
