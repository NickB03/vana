# Project Brief: VANA

## 1. Project Mission & Vision

**Mission:** To provide a robust and extensible suite of AI-powered services for advanced knowledge management, semantic search, and system health monitoring, enabling the development of intelligent applications.

**Vision:** VANA aims to be a reliable foundation for building sophisticated AI agents and applications by offering well-integrated, observable, and performant tools for interacting with complex information landscapes.

## 2. Core Goals

### Phase 1 (Current MVP Focus):
1.  **Functional Single Agent Core:** Develop a single, highly capable AI agent that can effectively utilize all integrated Vana tools.
2.  **Robust Vector Search & Monitoring:** Ensure the Vertex AI Vector Search integration is stable, performant, and continuously monitored through a comprehensive Health Monitoring System (Dashboard, Alerts, Health Checks).
3.  **Effective Document Processing:** Implement a document processing pipeline capable of handling various file types, performing semantic chunking, and preparing content for ingestion into knowledge systems. (Current: PyPDF2/Pytesseract; Target: Vertex AI Document AI as primary).
4.  **Integrated Knowledge Systems:** Provide functional integration with a Knowledge Graph (via MCP) and Web Search capabilities.
5.  **Hybrid Search Capability:** Enable effective information retrieval by combining results from Vector Search, Knowledge Graph, and Web Search.
6.  **Foundation for Scalability:** Build core tools and services (`tools/`, `dashboard/`, `config/`) in a modular way to support future expansion.

### Phase 2 (Future Direction):
1.  **Multi-Agent System (MAS):** Evolve the single agent core into a collaborative multi-agent system, where specialized agents can leverage Vana's tools and services to perform complex tasks.
2.  **Enhanced AI Capabilities:** Continuously improve the intelligence and capabilities of the agents and the underlying services (e.g., advanced entity extraction, relationship inference, proactive alerting).
3.  **Broader Tool & Service Integration:** Expand the suite of tools and integrate with more external services as needed.

## 3. Target Users/Audience

*   **Primary (Internal):** Nick (Project Lead, Technical User) for development, testing, and utilization of Vana's capabilities.
*   **Secondary (Internal):** Future developers or contributors to the Vana project.
*   **Potential Future:** Users of applications built on top of the Vana services.

## 4. Key Deliverables (Current Focus)

1.  A fully functional Vector Search Health Monitoring System (Flask API backend, Streamlit UI frontend).
2.  Reliable `VectorSearchClient` for interacting with Vertex AI.
3.  A working `DocumentProcessor` (currently PyPDF2/Pytesseract based).
4.  Functional `KnowledgeGraphManager` and `WebSearchClient`.
5.  An operational `EnhancedHybridSearch` capability.
6.  Comprehensive, up-to-date project documentation (this effort).
7.  A clear path and foundation for developing the Phase 1 single agent.
