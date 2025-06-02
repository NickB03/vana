# VANA System Architecture Overview

[Home](../index.md) > [Architecture](index.md) > System Overview

This document provides a high-level overview of the current VANA system architecture. VANA has evolved into a suite of AI-powered services designed for robust knowledge management, semantic search, and system health monitoring, supporting a conceptual single agent.

## 1. Core Philosophy

The current VANA architecture emphasizes:

*   **Modularity:** Core functionalities are developed as distinct, reusable tools and services.
*   **Observability:** Critical components, particularly Vertex AI Vector Search, are equipped with comprehensive health monitoring and visualization.
*   **Service-Oriented Design (Internal):** Key components (e.g., Vector Search client, Document Processor, KG Manager) function as internal services.
*   **API-Driven UI:** The primary user interface (Streamlit dashboard) interacts with a Flask-based API backend for data and control.
*   **Configurability:** System behavior, endpoints, and credentials are managed through environment variables.
*   **Foundation for Future Agents:** The current toolset and services are built to support a capable single agent (Phase 1 MVP), which will form the basis for a future multi-agent system (Phase 2).

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph UserInterfaces
        UI_Streamlit["Streamlit Frontend UI (dashboard/app.py)"]
    end

    subgraph BackendServices
        API_Flask["Flask API Backend (dashboard/flask_app.py)"]
    end

    subgraph CoreToolsAndServices["Core Tools & Services (tools/)"]
        VS_Client["VectorSearchClient"]
        VS_HealthChecker["VectorSearchHealthChecker"]
        DocProc["DocumentProcessor"]
        KG_Manager["KnowledgeGraphManager (MCP)"]
        HybridSearch["EnhancedHybridSearch"]
        WebSearch["WebSearchClient"]
        MonitoringUtils["Monitoring Utilities (Circuit Breaker, etc.)"]
        SecurityUtils["Security Utilities"]
        LoggingUtils["Logging Utilities"]
    end

    subgraph ExternalServices
        VertexAI["Google Vertex AI (Vector Search, Embeddings, Document AI [planned])"]
        MCP_KG["MCP Knowledge Graph Server"]
        GoogleSearchAPI["Google Custom Search API"]
    end

    subgraph DataAndConfig
        EnvConfig["Configuration (.env, config/environment.py)"]
        DataStorage["Data Storage (GCS [docs], Local Cache)"]
    end

    subgraph OperationalScripts["Operational Scripts (scripts/)"]
        ScheduledMonitor["ScheduledVectorSearchMonitor"]
        TestHealth["TestVectorSearchHealth"]
    end

    %% Conceptual Agent
    AgentCore["Conceptual Vana Single Agent (Phase 1 MVP)"]

    %% Connections
    UI_Streamlit --> API_Flask;
    API_Flask --> VS_HealthChecker;
    API_Flask --> MonitoringUtils;

    VS_HealthChecker --> VS_Client;
    ScheduledMonitor --> VS_HealthChecker;
    TestHealth --> VS_HealthChecker;

    AgentCore --> VS_Client;
    AgentCore --> DocProc;
    AgentCore --> KG_Manager;
    AgentCore --> HybridSearch;
    AgentCore --> WebSearch;

    HybridSearch --> VS_Client;
    HybridSearch --> KG_Manager;
    HybridSearch --> WebSearch;

    VS_Client --> VertexAI;
    DocProc --> VertexAI; %% For planned Document AI
    KG_Manager --> MCP_KG;
    WebSearch --> GoogleSearchAPI;

    CoreToolsAndServices --> EnvConfig;
    CoreToolsAndServices --> LoggingUtils;
    CoreToolsAndServices --> SecurityUtils;
    DocProc --> DataStorage; %% For reading source documents
```

*(Note: This is a simplified Mermaid diagram. A more detailed visual diagram should be created and embedded as an image for better clarity and aesthetics.)*

## 3. Key Architectural Components

### 3.1. Monitoring Dashboard
*   **Flask API Backend (`dashboard/flask_app.py`):**
    *   Serves RESTful APIs for health status, metrics, and potentially control operations.
    *   Handles authentication and authorization for dashboard access.
    *   Interfaces with monitoring tools (e.g., `VectorSearchHealthChecker`).
*   **Streamlit Frontend UI (`dashboard/app.py`):**
    *   Provides a web-based user interface for visualizing system health (especially Vector Search), performance metrics, historical trends, and alerts.
    *   Consumes data from the Flask API backend.

### 3.2. Core Tools & Services (`tools/` directory)
*   **Vector Search Integration (`tools/vector_search/`):**
    *   `VectorSearchClient`: Manages all interactions with Google Vertex AI Vector Search (CRUD for embeddings, search operations).
    *   `VectorSearchHealthChecker`: Performs comprehensive health diagnostics on the Vector Search service.
*   **Document Processing (`tools/document_processing/`):**
    *   `DocumentProcessor`: Handles parsing of various document formats (currently PyPDF2/Pytesseract).
    *   `SemanticChunker`: Splits documents into meaningful chunks for embedding.
    *   *Planned Enhancement:* Primary parsing using Vertex AI Document AI.
*   **Knowledge Graph (`tools/knowledge_graph/`):**
    *   `KnowledgeGraphManager`: Interacts with an MCP-compatible server for storing and querying structured knowledge (entities, relationships).
*   **Web Search (`tools/web_search_client.py`):**
    *   Client for Google Custom Search API to fetch real-time web information.
*   **Hybrid Search (`tools/enhanced_hybrid_search.py`):**
    *   Orchestrates queries across Vector Search, Knowledge Graph, and Web Search, combining results.
*   **Supporting Utilities:**
    *   `tools/monitoring/`: Includes resilience patterns like Circuit Breakers.
    *   `tools/security/`: Modules for credential management, access control.
    *   `tools/logging/`: Standardized logging facilities.

### 3.3. Configuration System (`config/environment.py`)
*   Manages loading of environment-specific settings (API keys, service endpoints, operational parameters) from `.env` files, allowing for different configurations for development, testing, and production.

### 3.4. Operational Scripts (`scripts/`)
*   Includes scripts for automated tasks (e.g., `scheduled_vector_search_monitor.py`) and on-demand utilities/tests (e.g., `test_vector_search_health.py`).

### 3.5. Conceptual Single Agent (Phase 1 MVP Goal)
*   While not a fully implemented discrete software module yet, the Vana system is being built to support a single, intelligent agent. This agent will leverage the core tools and services (Vector Search, Document Processing, KG, Hybrid Search, etc.) to perform complex tasks and interact with users. The current tools are the building blocks for this agent's capabilities.

## 4. Data and Control Flow Highlights
*   **Monitoring:** Scheduled scripts or API calls trigger the `VectorSearchHealthChecker`, which uses the `VectorSearchClient`. Results are exposed via the Flask API and visualized by the Streamlit UI.
*   **Search:** The `EnhancedHybridSearch` tool acts as a primary entry point for complex queries, delegating to the respective clients for Vector Search, KG, and Web Search.
*   **Document Ingestion (Conceptual):** Documents are processed by `DocumentProcessor`, chunked, embedded (via `VectorSearchClient`), and then indexed into Vector Search. Entities/relationships may be extracted by `KnowledgeGraphManager`.

## 5. Evolution to Multi-Agent System (Phase 2 Vision)
*   The robust suite of tools and the functional single agent (Phase 1) will serve as the foundation.
*   Phase 2 will introduce an orchestration layer and specialized agents that utilize these established tools to collaborate on more complex tasks.

This overview will be expanded with more detailed diagrams and explanations for each sub-system in their respective documentation sections.
