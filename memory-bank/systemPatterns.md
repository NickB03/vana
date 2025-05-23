# System Patterns & Architecture: VANA

## 1. Overall Architecture (Current MVP Focus)

VANA is currently architected as a suite of interconnected Python tools and services, with a web-based dashboard for monitoring. The primary goal is to provide a robust foundation for a single, highly capable AI agent (Phase 1 MVP), which will then serve as the basis for a multi-agent system (Phase 2).

**Key Architectural Components:**

*   **Core Services (`tools/` directory):**
    *   **Vector Search Service:**
        *   Client (`tools/vector_search/vector_search_client.py`) for Vertex AI.
        *   Health Checker (`tools/vector_search/health_checker.py`).
    *   **Document Processing Service:**
        *   Processor (`tools/document_processing/document_processor.py`) using PyPDF2/Pytesseract (target: Vertex AI Document AI).
        *   Semantic Chunker (`tools/document_processing/semantic_chunker.py`).
    *   **Knowledge Graph Service:**
        *   Manager (`tools/knowledge_graph/knowledge_graph_manager.py`) for MCP-based KG.
    *   **Web Search Service:**
        *   Client (`tools/web_search_client.py`) for Google Custom Search.
    *   **Hybrid Search Service:**
        *   Engine (`tools/enhanced_hybrid_search.py`) combining Vector Search, KG, and Web Search.
    *   **Supporting Services:** Security, Logging, Resilience, Feedback collection modules within `tools/`.
*   **Monitoring System:**
    *   **Flask Backend API (`dashboard/flask_app.py`):** Exposes endpoints for health data, metrics, and system control (e.g., triggering health checks). Handles authentication.
    *   **Streamlit Frontend UI (`dashboard/app.py`):** Consumes the Flask API to provide visualizations of system health (especially Vector Search), metrics, and alerts.
    *   **Scheduled Monitor (`scripts/scheduled_vector_search_monitor.py`):** Runs periodic health checks and can trigger alerts.
*   **Configuration (`config/environment.py`):** Centralized management of settings via environment variables (`.env` file).
*   **Single Agent Core (`agent/` directory):**
    *   Core Agent (`agent/core.py`): Provides task execution, tool integration, and session management.
    *   Task Parser (`agent/task_parser.py`): Parses user messages into structured tasks.
    *   Tools (`agent/tools/`): Modular components that provide specific functionality to the agent.

## 2. Key Design Patterns & Principles

*   **Modular Tool Design:** Core functionalities are encapsulated in specific classes/modules within the `tools/` directory, promoting separation of concerns and reusability.
*   **Service-Oriented (Internal):** While not a distributed microservices architecture, components like the Vector Search client, KG manager, etc., act as internal services that can be called upon.
*   **API-Driven Dashboard:** The Streamlit UI is decoupled from direct data fetching logic, instead relying on the Flask API backend. This allows for potentially different frontends or programmatic access to monitoring data.
*   **Resilience:**
    *   **Circuit Breaker Pattern:** Implemented in `tools/monitoring/circuit_breaker.py` (and potentially `tools/resilience/`) to protect against failures in external service calls (e.g., to Vertex AI).
    *   **Mock Implementations & Fallbacks:** Several clients (e.g., `VectorSearchClient`, `WebSearchClient`) include mock versions for testing and can gracefully degrade or fallback if primary services are unavailable.
*   **Configuration over Hardcoding:** System settings, API keys, and endpoints are managed via environment variables and `config/environment.py`, promoting flexibility across different environments (dev, test, prod). (Exception: `tools/web_search_client.py` needs to be updated).
*   **Extensibility:** The structure aims to allow new tools or services to be added.
*   **Observability:** The Vector Search Health Monitoring System is a prime example of building observability into critical components. Structured logging also contributes to this.

## 3. Data Flow (High-Level Examples)

*   **Monitoring Data Flow:**
    1.  `ScheduledVectorSearchMonitor` or manual trigger (`test_vector_search_health.py` / API call) executes `VectorSearchHealthChecker`.
    2.  `HealthChecker` uses `VectorSearchClient` to perform checks against Vertex AI.
    3.  Results are processed by `VectorSearchMonitor` in `dashboard/monitoring/`.
    4.  Flask API (`dashboard/flask_app.py` via `vector_search_routes.py`) exposes this data.
    5.  Streamlit UI (`dashboard/app.py` via `system_health.py` component) calls Flask API and renders data.
*   **Document Ingestion Flow (Conceptual):**
    1.  Document provided to `DocumentProcessor`.
    2.  `DocumentProcessor` uses PyPDF2/Pytesseract (or future Document AI) for parsing.
    3.  `SemanticChunker` splits text.
    4.  Embeddings generated (likely via `VectorSearchClient`).
    5.  Chunks + Embeddings uploaded via `VectorSearchClient` to Vertex AI.
    6.  Entities/relationships potentially extracted by `KnowledgeGraphManager` and stored in MCP KG.
*   **Hybrid Search Query Flow:**
    1.  Query received by `EnhancedHybridSearch`.
    2.  Parallel queries dispatched to `VectorSearchClient`, `KnowledgeGraphManager`, `WebSearchClient`.
    3.  Results from each source are collected.
    4.  `EnhancedHybridSearch` combines, ranks, and formats results.

## 4. Future Architectural Evolution (Phase 2 - Multi-Agent System)

*   The current suite of tools and the conceptual single agent will serve as the foundation.
*   The MAS will likely involve an orchestration layer to manage tasks and delegate to specialized agents.
*   These specialized agents would use the existing Vana tools (`VectorSearchClient`, `KnowledgeGraphManager`, etc.) as their primary means of interacting with data and performing actions.
*   Communication and context management between agents will be a key architectural consideration for Phase 2.
