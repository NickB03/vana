# Hybrid Search Architecture

[Home](../../index.md) > [Architecture](../index.md) > Hybrid Search

This document describes the architecture of VANA's Enhanced Hybrid Search system. This system is designed to provide more comprehensive and relevant search results by intelligently combining information from multiple sources: Vector Search, Knowledge Graph, and Web Search.

## 1. Overview

Traditional search methods often excel in one area but lack in others. Vector search is good for semantic similarity, knowledge graphs provide structured facts, and web search offers real-time information. VANA's `EnhancedHybridSearch` aims to leverage the strengths of each by querying them in parallel and then synthesizing their outputs into a unified, ranked set of results.

## 2. Architectural Diagram

```mermaid
graph TD
    subgraph VanaSystem["Vana System"]
        AgentCore["Conceptual Vana Single Agent"]
        HybridSearch["EnhancedHybridSearch (tools/enhanced_hybrid_search.py)"]
        
        subgraph DataSourcesClients["Data Source Clients"]
            VS_Client["VectorSearchClient (tools/vector_search/vector_search_client.py)"]
            KG_Manager["KnowledgeGraphManager (tools/knowledge_graph/knowledge_graph_manager.py)"]
            WebSearchClient["WebSearchClient (tools/web_search_client.py)"]
        end
    end

    subgraph ExternalServices["External Data Sources"]
        VertexAI_VS["Vertex AI Vector Search"]
        MCP_KG_Server["MCP Knowledge Graph Server"]
        GoogleSearchAPI["Google Custom Search API"]
    end

    subgraph Configuration
        EnvConfig["Configuration (.env, config/environment.py)"]
    end

    %% Connections
    AgentCore -- "Initiates search via" --> HybridSearch;
    
    HybridSearch -- "Queries" --> VS_Client;
    HybridSearch -- "Queries" --> KG_Manager;
    HybridSearch -- "Queries" --> WebSearchClient;
    HybridSearch -- "Reads" --> EnvConfig;

    VS_Client -- "Interacts with" --> VertexAI_VS;
    KG_Manager -- "Interacts with" --> MCP_KG_Server;
    WebSearchClient -- "Interacts with" --> GoogleSearchAPI;
    
    VS_Client -- "Reads" --> EnvConfig;
    KG_Manager -- "Reads" --> EnvConfig;
    WebSearchClient -- "Reads" --> EnvConfig;

    classDef vanacomp fill:#E1D5E7,stroke:#9673A6,stroke-width:2px;
    classDef external fill:#F8CECC,stroke:#B85450,stroke-width:2px;
    classDef config fill:#DAE8FC,stroke:#6C8EBF,stroke-width:2px;

    class AgentCore, HybridSearch, VS_Client, KG_Manager, WebSearchClient vanacomp;
    class VertexAI_VS, MCP_KG_Server, GoogleSearchAPI external;
    class EnvConfig config;
```

## 3. Key Components

### 3.1. EnhancedHybridSearch (`tools/enhanced_hybrid_search.py`)
*   **Purpose:** This is the orchestrator for the hybrid search process. It receives a user query and manages the process of querying multiple underlying search systems and combining their results.
*   **Key Responsibilities:**
    *   **Query Preprocessing (Optional):** May perform query analysis, expansion, or classification to tailor sub-queries for different sources.
    *   **Parallel Querying:** Dispatches the query (or modified versions of it) to the `VectorSearchClient`, `KnowledgeGraphManager`, and `WebSearchClient` simultaneously.
    *   **Result Aggregation:** Collects results from all sources.
    *   **Normalization & Deduplication:** Standardizes the format of results from different sources and attempts to remove duplicate information.
    *   **Ranking & Re-ranking:** Applies a strategy to rank the combined results. This might involve a simple interleaving, a weighted scoring mechanism based on source reliability or relevance, or more advanced machine learning-based re-ranking.
    *   **Formatting Output:** Presents the final, ranked list of results in a unified format.
*   **Configuration:** Reads settings related to source weighting, result limits, etc., from `config/environment.py`.

### 3.2. Data Source Clients
These are the individual clients that `EnhancedHybridSearch` uses to interact with the actual data sources:
*   **`VectorSearchClient`:** Queries the Vertex AI Vector Search index for semantically similar documents or text chunks.
*   **`KnowledgeGraphManager`:** Queries the MCP Knowledge Graph server for relevant entities, relationships, or factual answers.
*   **`WebSearchClient`:** Queries the Google Custom Search API for real-time information from the web.

Each client is responsible for its own communication protocol with its respective backend service and is configured independently via `config/environment.py`.

### 3.3. Conceptual Vana Single Agent
*   **Purpose:** The VANA agent is the primary consumer of the `EnhancedHybridSearch` tool.
*   **Interaction:** When the agent needs to find information to answer a question or perform a task, it will typically delegate this to the `EnhancedHybridSearch` to get the most comprehensive set of results.

## 4. Search & Retrieval Flow

1.  **Query Input:** The `Conceptual Vana Single Agent` (or another system component) submits a query to `EnhancedHybridSearch`.
2.  **Query Dispatch:** `EnhancedHybridSearch` sends the query (possibly adapted for each source) to:
    *   `VectorSearchClient` (targets Vertex AI Vector Search).
    *   `KnowledgeGraphManager` (targets MCP Knowledge Graph Server).
    *   `WebSearchClient` (targets Google Custom Search API).
3.  **Concurrent Execution:** The clients execute their queries against their respective data sources in parallel.
4.  **Result Collection:** Each client returns its findings to `EnhancedHybridSearch`.
5.  **Result Processing by `EnhancedHybridSearch`:**
    *   **Normalization:** Results are converted into a common internal format.
    *   **Deduplication:** Identical or highly similar results from different sources may be merged or removed.
    *   **Scoring/Ranking:** A scoring algorithm is applied. This could be based on:
        *   Relevance scores from individual sources.
        *   Source-specific weights (e.g., KG facts might be weighted higher for certain query types).
        *   Diversity of information.
        *   Timeliness (especially for web results).
    *   **Re-ranking:** The combined list is sorted based on the final scores.
6.  **Output:** `EnhancedHybridSearch` returns a single, ranked list of results to the VANA Agent.

## 5. Ranking and Re-ranking Strategies (Conceptual)

The effectiveness of hybrid search heavily depends on its ranking strategy. While the specific implementation in `EnhancedHybridSearch` will evolve, potential strategies include:

*   **Keyword-Semantic Blend:** Combining traditional keyword relevance with semantic similarity scores.
*   **Source Trustworthiness:** Assigning different weights based on the perceived reliability of the data source.
*   **Reciprocal Rank Fusion (RRF) or similar:** Algorithms that combine ranks from multiple systems without needing to normalize scores directly.
*   **User Feedback Loop:** Incorporating user feedback (if available via `tools/feedback_collector.py`) to adjust ranking over time.
*   **Query Intent Classification:** Using different ranking strategies based on the inferred intent of the user's query (e.g., factual question vs. exploratory search).

## 6. Configuration
Key configurable aspects for `EnhancedHybridSearch` (managed via `config/environment.py`) might include:
*   Weights for different search sources.
*   Number of results to fetch from each source.
*   Timeout settings for individual source queries.
*   Parameters for the chosen ranking/re-ranking algorithm.

This hybrid approach allows VANA to provide richer, more accurate, and more timely information than any single search method could achieve alone.
