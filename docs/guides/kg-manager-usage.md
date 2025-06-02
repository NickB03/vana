# KnowledgeGraphManager Usage Guide

[Home](../../index.md) > [Guides](../index.md) > KnowledgeGraphManager Usage

This guide explains how to use the `KnowledgeGraphManager` (`tools/knowledge_graph/knowledge_graph_manager.py`) in VANA. This tool is responsible for interacting with an MCP (Model Context Protocol) compatible Knowledge Graph server, allowing VANA to store and retrieve structured knowledge in the form of entities and relationships.

## 1. Prerequisites

*   **VANA Installation:** Complete VANA project setup as per the [Installation Guide](installation-guide.md).
*   **Configuration:** Ensure your `.env` file is correctly configured with:
    *   `MCP_ENDPOINT`: The URL of your MCP Knowledge Graph server.
    *   `MCP_NAMESPACE`: The namespace to use for VANA's data on the MCP server.
    *   `MCP_API_KEY`: Your API key for authenticating with the MCP server.
    *   (Optionally `USE_LOCAL_MCP=true` if `VANA_ENV=development` to use a local default endpoint).
*   **MCP Server Access:** Ensure the VANA system can network-reach the configured MCP server.
*   **Virtual Environment:** Activate your Python virtual environment.

## 2. Importing and Initializing the KnowledgeGraphManager

```python
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from config import environment  # To ensure .env is loaded

# Initialize the client
# It automatically picks up configuration from environment variables
try:
    kg_manager = KnowledgeGraphManager()
    print("KnowledgeGraphManager initialized successfully.")
    print(f"Using MCP Endpoint: {kg_manager.mcp_client.base_url}") # Assuming mcp_client is accessible
except Exception as e:
    print(f"Error initializing KnowledgeGraphManager: {e}")
    kg_manager = None
```
The `KnowledgeGraphManager` typically wraps an `MCPClient` (e.g., from `tools/mcp_memory_client.py` or a similar utility) which handles the actual HTTP requests to the MCP server.

## 3. Core Functionalities

The `KnowledgeGraphManager` provides methods for creating, reading, updating, and deleting entities and relationships. (Note: Method names and parameters might vary based on the exact implementation. Always refer to the source code or its docstrings.)

### 3.1. Adding Entities

Entities are the primary nodes in the knowledge graph.

```python
if kg_manager:
    entity_name = "ProjectVana"
    entity_type = "SoftwareProject"
    observations = [
        "VANA is a suite of AI services.",
        "Focuses on knowledge management and vector search monitoring."
    ]

    try:
        response = kg_manager.add_entity(
            name=entity_name,
            entity_type=entity_type,
            observations=observations
        )
        # Response structure depends on the MCP server and client implementation
        # Typically, it might confirm success or return the created entity's details.
        print(f"\nAdd Entity Response for '{entity_name}': {response}")
    except Exception as e:
        print(f"Error adding entity '{entity_name}': {e}")

    # Example: Adding another entity
    entity_name_2 = "VertexAI"
    entity_type_2 = "CloudService"
    observations_2 = ["Used for Vector Search and Embeddings in VANA."]
    try:
        response_2 = kg_manager.add_entity(entity_name_2, entity_type_2, observations_2)
        print(f"Add Entity Response for '{entity_name_2}': {response_2}")
    except Exception as e:
        print(f"Error adding entity '{entity_name_2}': {e}")
```

### 3.2. Adding Relationships

Relationships connect entities, defining how they are related. Relationships are typically directed.

```python
if kg_manager:
    # Assuming entities "ProjectVana" and "VertexAI" were added previously
    from_entity = "ProjectVana"
    to_entity = "VertexAI"
    relation_type = "usesService" # Example: ProjectVana usesService VertexAI

    try:
        response = kg_manager.add_relation(
            from_entity=from_entity,
            to_entity=to_entity,
            relation_type=relation_type
        )
        print(f"\nAdd Relation Response ('{from_entity}' {relation_type} '{to_entity}'): {response}")
    except Exception as e:
        print(f"Error adding relation ('{from_entity}' {relation_type} '{to_entity}'): {e}")
```

### 3.3. Getting Entity Information

Retrieve details about a specific entity.

```python
if kg_manager:
    entity_to_get = "ProjectVana"
    try:
        entity_data = kg_manager.get_entity(name=entity_to_get)
        if entity_data:
            print(f"\nData for entity '{entity_to_get}':")
            print(f"  Name: {entity_data.get('name')}")
            print(f"  Type: {entity_data.get('entity_type')}")
            print(f"  Observations: {entity_data.get('observations')}")
            print(f"  Incoming Relations: {entity_data.get('incoming_relations')}")
            print(f"  Outgoing Relations: {entity_data.get('outgoing_relations')}")
        else:
            print(f"  Entity '{entity_to_get}' not found or error retrieving.")
    except Exception as e:
        print(f"Error getting entity '{entity_to_get}': {e}")
```

### 3.4. Querying the Knowledge Graph

The `KnowledgeGraphManager` might offer various ways to query the graph:
*   **Simple path queries:** Find entities connected by a specific path.
*   **Pattern matching:** Find subgraphs that match a certain pattern.
*   **Keyword search:** Search for entities or observations containing keywords (if supported by the MCP server implementation).

```python
if kg_manager:
    # Example: A conceptual query method (actual method may differ)
    # This might search for entities of a certain type or with certain observations.
    query_params = {"entity_type": "SoftwareProject"}
    # Or query_params = {"observation_contains": "monitoring"}

    try:
        # The actual query method name and parameters will depend on the implementation.
        # e.g., kg_manager.query_entities(params=query_params)
        # e.g., kg_manager.search_graph(search_term="VANA")

        # For this example, let's assume a generic search method if it exists:
        # search_results = kg_manager.search_nodes(query="VANA")
        # print(f"\nSearch results for 'VANA': {search_results}")

        print("\nQuerying KG (conceptual):")
        print("  Functionality depends on the specific implementation of KnowledgeGraphManager.")
        print("  Common methods might include `get_related_entities`, `find_paths`, or a generic `query`.")
        print("  Please refer to `tools/knowledge_graph/knowledge_graph_manager.py` for actual methods.")

    except Exception as e:
        print(f"  Error during conceptual KG query: {e}")
```
*Refer to the `KnowledgeGraphManager` source code for the exact query capabilities and methods available.*

### 3.5. Updating Entities or Relationships (Conceptual)

Methods to update existing entities (e.g., add new observations) or relationships.

```python
if kg_manager:
    # Example: Add an observation to an existing entity
    entity_to_update = "ProjectVana"
    new_observation = "VANA is actively developed by Nick."
    try:
        # response = kg_manager.add_observation_to_entity(
        #     name=entity_to_update,
        #     observation=new_observation
        # )
        # print(f"\nUpdate Entity Response for '{entity_to_update}': {response}")

        print(f"\nUpdating entity '{entity_to_update}' (conceptual):")
        print("  Functionality depends on the specific implementation of KnowledgeGraphManager.")
    except Exception as e:
        print(f"  Error updating entity '{entity_to_update}': {e}")
```

### 3.6. Deleting Entities or Relationships

Methods to remove data from the Knowledge Graph.

```python
if kg_manager:
    entity_to_delete = "OldProject" # Assume this was added for testing
    try:
        # response = kg_manager.delete_entity(name=entity_to_delete)
        # print(f"\nDelete Entity Response for '{entity_to_delete}': {response}")

        print(f"\nDeleting entity '{entity_to_delete}' (conceptual):")
        print("  Functionality depends on the specific implementation of KnowledgeGraphManager.")
    except Exception as e:
        print(f"  Error deleting entity '{entity_to_delete}': {e}")
```

## 4. Error Handling

*   The `KnowledgeGraphManager` and its underlying `MCPClient` should handle HTTP errors from the MCP server.
*   Common issues include:
    *   Network connectivity to the MCP server.
    *   Incorrect `MCP_ENDPOINT` or `MCP_API_KEY`.
    *   MCP server errors (e.g., malformed requests, internal server issues).
    *   Entities not found for update/delete operations.
*   Wrap calls to `KnowledgeGraphManager` methods in `try...except` blocks to manage potential exceptions.

## 5. Use Cases in VANA

*   **Hybrid Search:** The `EnhancedHybridSearch` tool uses `KnowledgeGraphManager` to fetch structured data complementing results from Vector Search and Web Search.
*   **Agent Knowledge Base:** The VANA agent can use the KG to store and retrieve facts, relationships, and contextual information learned during its operations.
*   **Document Ingestion:** After processing documents, extracted entities and relationships can be stored in the KG to build a structured representation of the document corpus.

## 6. Best Practices

*   **Consistent Naming:** Use a consistent naming convention for entities and relationship types.
*   **Schema Design (Conceptual):** While MCP is often schema-flexible, have a conceptual schema for VANA's data to ensure consistency (e.g., always use "SoftwareProject" for projects, "usesService" for service dependencies).
*   **Idempotency:** Design operations to be idempotent where possible (e.g., adding an entity that already exists should not create a duplicate or error out, but perhaps update it or do nothing). This depends on the MCP server's behavior and how the `KnowledgeGraphManager` handles it.
*   **Batching:** If adding many entities or relationships, check if the `KnowledgeGraphManager` or `MCPClient` supports batch operations for efficiency.

The `KnowledgeGraphManager` is a key tool for enabling VANA to work with structured knowledge. Consult its source code for the most up-to-date list of methods and their specific parameters.
