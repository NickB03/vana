# Knowledge Graph Integration Architecture

[Home](../../index.md) > [Architecture](../index.md) > Knowledge Graph Integration

This document outlines the architecture for VANA's integration with a Knowledge Graph (KG). The KG serves as a repository for structured knowledge, complementing the semantic search capabilities provided by Vector Search.

## 1. Overview

VANA's Knowledge Graph integration allows for the storage and retrieval of entities and their relationships. This structured data can be used to enhance search results, provide context, and enable more sophisticated reasoning by the VANA agent. The integration is primarily managed by the `KnowledgeGraphManager` tool, which communicates with an external or locally hosted MCP (Model Context Protocol) server.

## 2. Architectural Diagram

```mermaid
graph TD
    subgraph VanaSystem["Vana System"]
        AgentCore["Conceptual Vana Single Agent"]
        HybridSearch["EnhancedHybridSearch (tools/enhanced_hybrid_search.py)"]
        KG_Manager["KnowledgeGraphManager (tools/knowledge_graph/knowledge_graph_manager.py)"]
        DocProc["DocumentProcessor (tools/document_processing/document_processor.py)"]
    end

    subgraph MCPInfrastructure["MCP Infrastructure"]
        MCP_Server["MCP Knowledge Graph Server (External or Local)"]
    end

    subgraph Configuration
        EnvConfig["Configuration (.env, config/environment.py)"]
    end

    %% Connections
    AgentCore -- "Uses for KG ops" --> KG_Manager;
    HybridSearch -- "Queries for KG results" --> KG_Manager;
    DocProc -- "Potentially sends extracted entities/relations to" --> KG_Manager;

    KG_Manager -- "HTTP API Calls (MCP)" --> MCP_Server;
    KG_Manager -- "Reads" --> EnvConfig;

    classDef vanacomp fill:#E1D5E7,stroke:#9673A6,stroke-width:2px;
    classDef mcp fill:#F8CECC,stroke:#B85450,stroke-width:2px;
    classDef config fill:#DAE8FC,stroke:#6C8EBF,stroke-width:2px;

    class AgentCore, HybridSearch, KG_Manager, DocProc vanacomp;
    class MCP_Server mcp;
    class EnvConfig config;
```

## 3. Key Components

### 3.1. KnowledgeGraphManager (`tools/knowledge_graph/knowledge_graph_manager.py`)
*   **Purpose:** This is the central VANA component responsible for all interactions with the Knowledge Graph.
*   **Key Responsibilities:**
    *   **CRUD Operations:** Managing entities and relationships in the KG (Create, Read, Update, Delete).
    *   **Querying:** Executing queries against the KG to retrieve specific entities, relationships, or subgraphs.
    *   **Schema Management (Conceptual):** While MCP is flexible, the `KnowledgeGraphManager` might enforce or expect certain schemas for entities and relations relevant to VANA.
    *   **MCP Communication:** Handles all HTTP API communication with the configured MCP server, formatting requests and parsing responses according to the Model Context Protocol.
*   **Configuration:** Reads MCP server endpoint, namespace, and API key from `.env` via `config/environment.py`.

### 3.2. MCP Knowledge Graph Server
*   **Purpose:** An external or locally hosted server that implements the Model Context Protocol for graph data. It stores the actual knowledge graph data.
*   **Key Features (from VANA's perspective):**
    *   Provides API endpoints for graph operations (e.g., adding nodes/edges, querying).
    *   Persists the graph data.
    *   Can be a community-hosted instance (e.g., `mcp.community.augment.co`) or a local development server.
*   **Interaction:** The `KnowledgeGraphManager` communicates with this server using HTTP requests.

### 3.3. Conceptual Vana Single Agent
*   **Purpose:** The VANA agent can leverage the `KnowledgeGraphManager` to:
    *   Store new information discovered during its operations as structured data.
    *   Query the KG for existing knowledge to inform its decisions or supplement search results.
    *   Enrich its understanding of entities and their connections.

### 3.4. EnhancedHybridSearch (`tools/enhanced_hybrid_search.py`)
*   **Purpose:** This tool uses the `KnowledgeGraphManager` as one of its sources when performing a hybrid search.
*   **Interaction:** It sends queries to the KG via the `KnowledgeGraphManager` and incorporates the structured results alongside those from Vector Search and Web Search.

### 3.5. DocumentProcessor (`tools/document_processing/document_processor.py`)
*   **Purpose (Potential KG Interaction):** While processing documents, the `DocumentProcessor` (or a subsequent component in an ingestion pipeline) could extract named entities and relationships.
*   **Interaction:** These extracted structured insights could then be passed to the `KnowledgeGraphManager` for storage in the KG, building up the graph from ingested content.

## 4. Data Flow Examples

### 4.1. Storing Data in KG
1.  The VANA Agent or `DocumentProcessor` identifies a piece of structured information (e.g., an entity "Project Vana" of type "Software Project" with a relationship "developed_by" to entity "Nick" of type "Person").
2.  It calls the appropriate method on `KnowledgeGraphManager` (e.g., `add_entity`, `add_relation`).
3.  `KnowledgeGraphManager` constructs an MCP-compliant API request.
4.  The request is sent to the `MCP Knowledge Graph Server`.
5.  The MCP server processes the request and stores the data.

### 4.2. Querying Data from KG
1.  The VANA Agent or `EnhancedHybridSearch` needs information from the KG (e.g., "What are the components of Project Vana?").
2.  It calls a query method on `KnowledgeGraphManager`.
3.  `KnowledgeGraphManager` constructs an MCP-compliant query.
4.  The query is sent to the `MCP Knowledge Graph Server`.
5.  The MCP server executes the query and returns the results.
6.  `KnowledgeGraphManager` parses the response and returns it to the caller.

## 5. Configuration
*   The endpoint URL for the MCP server.
*   The namespace to be used on the MCP server (to isolate VANA's data).
*   The API key for authentication with the MCP server.
These are all configured via environment variables and accessed through `config/environment.py`.

This architecture allows VANA to leverage the power of structured knowledge, enhancing its overall information processing and retrieval capabilities.
