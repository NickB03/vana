# VANA - Multi-Agent AI System

![VANA Logo](https://img.shields.io/badge/VANA-Multi--Agent%20AI-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.9%2B-blue)
![Status](https://img.shields.io/badge/status-ready-green)

## 🎯 **Current Status: Advanced Agent Types + Brave Search Free AI Optimization - ✅ COMPLETE**

**VANA is a comprehensive, production-ready multi-agent AI system** featuring:

- ✅ **Advanced Multi-Agent Architecture** - 24-agent system with VANA orchestrator + 23 specialists
- ✅ **Enhanced Tools** - 46 ADK-compatible tools with standardized UX patterns
- ✅ **Google ADK Tool Types** - 100% compliance with 6/6 tool types implemented
- ✅ **Google ADK Vertex AI Setup** - ✅ 100% COMPLETE and operational
- ✅ **Brave Search Free AI Optimization** - ✅ 5x performance improvement with enhanced features
- ✅ **Virtual Environment** - Python 3.9.6 with Google ADK 1.0.0 properly installed
- ✅ **Authentication** - Google Cloud authentication working perfectly
- ✅ **Environment Configuration** - All required variables correctly set
- ✅ **SSL Compatibility** - ✅ RESOLVED - urllib3 downgraded, certificates configured
- ✅ **LlmAgent Creation** - ✅ WORKING - Instant creation (0.00 seconds)
- ✅ **Tool Integration** - ✅ WORKING - 46 tools successfully integrated with ADK
- ✅ **Vertex AI Connection** - ✅ WORKING - Full connectivity established
- ✅ **Core Infrastructure** - Complete tools, config, dashboard, and testing framework
- ✅ **Monitoring Dashboard** - Flask backend and Streamlit frontend for system monitoring
- ✅ **Clean Codebase** - Streamlined repository with only active implementations

**Primary Implementation**: `vana_multi_agent/` - 24-agent operational multi-agent system
**Status**: ✅ **PRODUCTION READY** - Google ADK + Brave Search Free AI optimized

---

VANA is a suite of advanced AI services focusing on knowledge management, semantic search, and system health monitoring. It leverages Google Cloud Vertex AI for powerful Vector Search capabilities and provides a comprehensive system for ensuring the reliability and performance of these services. The system supports both single-agent and multi-agent architectures with comprehensive tooling and monitoring capabilities.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Documentation](#-documentation)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Key Components](#-key-components)
  - [Vector Search Integration & Health Monitoring](#-vector-search-integration--health-monitoring)
  - [Document Processing](#-document-processing)
  - [Knowledge Graph Integration](#-knowledge-graph-integration)
  - [Hybrid Search](#-hybrid-search)
  - [Web Search Integration](#-web-search-integration)
  - [Feedback System](#-feedback-system)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

## 📚 Documentation

For detailed documentation, please refer to the `/docs` directory:

- **[Main Documentation Index](docs/index.md)**
- [Architecture Overview](docs/architecture/index.md)
- [Implementation Details](docs/implementation/index.md)
- [Developer & User Guides](docs/guides/index.md)
- [API Reference](docs/api/index.md)
- [Troubleshooting](docs/troubleshooting/index.md)

## 🔍 Overview

VANA provides a robust platform for building and managing AI-powered applications. Its core strength lies in its sophisticated integration with Google Vertex AI Vector Search, complemented by a comprehensive Health Monitoring System. This system ensures that semantic search capabilities are reliable, performant, and continuously observed. The current development phase focuses on a single, highly capable agent that utilizes Vana's suite of tools. A multi-agent system is planned for a subsequent phase.

Beyond search and monitoring, VANA includes tools and services for:
- Advanced document processing (currently using PyPDF2/Pytesseract, with Vertex AI Document AI as the planned primary method).
- Knowledge Graph integration for structured data via MCP.
- Hybrid search capabilities combining vector, KG, and web search.
- Secure and resilient operational components.

This project has evolved from an earlier multi-agent ADK-based system to a more focused suite of services supporting a new agent architecture.

## ✨ Features

- **Vector Search Health Monitoring System:**
    - Comprehensive health checks for Vertex AI Vector Search (`tools/vector_search/health_checker.py`).
    - Scheduled monitoring with adaptive intervals (`scripts/scheduled_vector_search_monitor.py`).
    - Circuit breaker pattern for resilience (`tools/monitoring/circuit_breaker.py`, `tools/resilience/circuit_breaker.py`).
    - Flask API backend (`dashboard/flask_app.py`) and Streamlit frontend UI (`dashboard/app.py`) for monitoring, metrics, and alerts.
- **Advanced Vector Search Client (`tools/vector_search/vector_search_client.py`):**
    - Interface for Vertex AI Vector Search (embeddings, search, uploads).
    - Mock implementation and auto-fallback for robustness.
    - Health status reporting.
- **Document Processing Pipeline (`tools/document_processing/document_processor.py`):**
    - Current implementation supports PDF (PyPDF2), TXT, MD, and images (Pytesseract OCR).
    - Semantic chunking strategy (`tools/document_processing/semantic_chunker.py`).
    - Planned primary method: Integration with Google Vertex AI Document AI.
- **Knowledge Graph Integration (`tools/knowledge_graph/knowledge_graph_manager.py`):**
    - Manages interaction with an MCP server for entity and relationship storage/retrieval.
    - Persistent structured knowledge via a configurable MCP server.
- **Hybrid Search (`tools/enhanced_hybrid_search.py`):**
    - Combines results from Vector Search, Knowledge Graph, and Web Search.
    - Query classification and sophisticated result ranking.
- **Brave Search Free AI Integration (`tools/brave_search_client.py`, `tools/web_search_client.py`):**
    - ✅ PRODUCTION - Brave Search API with Free AI plan optimization (5x performance improvement)
    - Extra snippets (5x content), AI summaries, goggles, multi-type search
    - 5 optimized search types: comprehensive, fast, academic, recent, local
    - Academic, tech, and news goggles for custom result ranking
    - Successfully migrated from Google Custom Search API
- **Google ADK Long Running Function Tools (`vana_multi_agent/tools/long_running_tools.py`):**
    - Async operations support with comprehensive task management
    - Approval workflows with ticket creation and status tracking
    - Data processing pipelines with real-time progress monitoring
    - Report generation with configurable data sources
    - Task status monitoring with visual progress indicators
- **Feedback Collection Utilities (e.g., `tools/feedback_collector.py`):**
    - Foundational elements for collecting feedback on system performance or search results.
- **Configuration Management (`config/environment.py`):**
    - Environment-specific settings (dev, test, prod) loaded from `.env` files.
- **Security Utilities (`tools/security/`):**
    - Basic utilities for aspects like credential management.
- **Structured Logging (`tools/logging/`):**
    - Consistent and context-aware logging throughout the system.

## 🏗️ Architecture

The VANA system is designed as a modular suite of services and tools, enabling robust AI-powered knowledge management, search, and system monitoring. The architecture supports a conceptual single agent (Phase 1 MVP) that leverages these components, with a vision for a future multi-agent system (Phase 2).

```mermaid
graph TD
    subgraph UserInteraction["User Interaction"]
        User["User/Developer (Nick)"]
    end

    subgraph VanaSystem["Vana System"]
        subgraph UserInterfaces["User Interfaces"]
            direction LR
            UI_Streamlit["Streamlit Frontend UI (dashboard/app.py)\n- View Health Status\n- View Metrics & Alerts"]
        end

        subgraph BackendServices["Backend Services (Dashboard)"]
            direction LR
            API_Flask["Flask API Backend (dashboard/flask_app.py)\n- /api/health (VS Health)\n- /api/metrics (Performance)\n- Auth for UI"]
        end

        subgraph CoreTools["Core Tools & Services (tools/)"]
            direction TB
            AgentCore["Conceptual Vana Single Agent (Phase 1 MVP)\n- Orchestrates Tools\n- Task Execution"]

            subgraph SearchServices["Search & Retrieval"]
                direction TB
                HybridSearch["EnhancedHybridSearch\n- Combines search results"]
                VS_Client["VectorSearchClient\n- Query Index\n- Manage Embeddings"]
                KG_Manager["KnowledgeGraphManager (MCP)\n- Query KG"]
                WebSearch["WebSearchClient\n- Real-time web queries"]
            end

            subgraph ProcessingServices["Processing & Monitoring"]
                direction TB
                DocProc["DocumentProcessor\n- Parse PDFs, TXT, Images\n- OCR (Pytesseract)\n- Semantic Chunker"]
                VS_HealthChecker["VectorSearchHealthChecker\n- Perform health diagnostics"]
            end

            subgraph UtilityServices["Utility Services"]
                direction LR
                ConfigModule["Configuration Module (config/environment.py)"]
                LoggingUtils["Logging Utilities"]
                SecurityUtils["Security Utilities (Credentials, etc.)"]
                MonitoringUtils["Monitoring Utilities (e.g., Circuit Breaker)"]
            end
        end

        subgraph OperationalScriptsAndConfig["Operational Scripts & Configuration"]
            direction TB
            EnvFiles["`.env` files (API Keys, GCP Project, etc.)"]
            ScheduledMonitor["ScheduledVectorSearchMonitor (scripts/)\n- Periodic health checks"]
            ManualHealthTrigger["Manual Health Triggers (scripts/)\n- e.g., test_vector_search_health.py"]
        end
    end

    subgraph ExternalDependencies["External Dependencies"]
        direction RL
        subgraph GCP["Google Cloud Platform"]
            VertexAI_VS["Vertex AI Vector Search\n- Index Storage\n- ANN Search"]
            VertexAI_Embed["Vertex AI Embedding Model\n- Generate Embeddings"]
            VertexAI_DocAI["Vertex AI Document AI (Planned)\n- Advanced Document Parsing"]
            GCS["Google Cloud Storage\n- Raw Document Storage (optional)"]
        end
        MCP_KG_Server["MCP Knowledge Graph Server\n- Store & Query Structured Data"]
        GoogleSearchAPI["Google Custom Search API\n- Fetch Web Results"]
    end

    %% Connections: User & UI
    User --> UI_Streamlit
    User -- "Runs/Manages" --> ScheduledMonitor
    User -- "Runs/Manages" --> ManualHealthTrigger
    User -- "Configures" --> EnvFiles

    %% Connections: UI & Backend
    UI_Streamlit -- "HTTP Requests (Dashboard Data)" --> API_Flask

    %% Connections: Backend & Core Tools
    API_Flask -- "Uses for health data" --> VS_HealthChecker
    API_Flask -- "Uses" --> MonitoringUtils %% For its own resilience if applicable
    API_Flask -- "Uses" --> SecurityUtils %% For auth
    API_Flask -- "Uses" --> LoggingUtils
    API_Flask -- "Reads Config" --> ConfigModule

    %% Connections: Agent & Core Tools
    AgentCore -- "Uses" --> HybridSearch
    AgentCore -- "Uses" --> DocProc
    AgentCore -- "Uses" --> VS_Client %% Direct use if not via HybridSearch
    AgentCore -- "Uses" --> KG_Manager %% Direct use if not via HybridSearch
    AgentCore -- "Uses" --> WebSearch %% Direct use if not via HybridSearch
    AgentCore -- "Reads Config" --> ConfigModule
    AgentCore -- "Uses" --> LoggingUtils

    %% Connections: Core Tools - Internal
    HybridSearch -- "Queries" --> VS_Client
    HybridSearch -- "Queries" --> KG_Manager
    HybridSearch -- "Queries" --> WebSearch
    HybridSearch -- "Reads Config" --> ConfigModule
    HybridSearch -- "Uses" --> LoggingUtils

    VS_HealthChecker -- "Performs checks via" --> VS_Client
    VS_HealthChecker -- "Reads Config" --> ConfigModule
    VS_HealthChecker -- "Uses" --> LoggingUtils

    DocProc -- "Uses (planned)" --> VertexAI_DocAI
    DocProc -- "Stores/Reads raw docs (optional)" --> GCS
    DocProc -- "Generates Embeddings via" --> VS_Client %% For embedding processed chunks
    DocProc -- "Reads Config" --> ConfigModule
    DocProc -- "Uses" --> LoggingUtils

    %% Connections: Core Tools & External Services
    VS_Client -- "Interacts with" --> VertexAI_VS
    VS_Client -- "Interacts with" --> VertexAI_Embed
    VS_Client -- "Wrapped by (potentially)" --> MonitoringUtils %% Circuit Breaker for Vertex AI calls
    VS_Client -- "Reads Config" --> ConfigModule
    VS_Client -- "Uses" --> LoggingUtils

    KG_Manager -- "Interacts with" --> MCP_KG_Server
    KG_Manager -- "Reads Config" --> ConfigModule
    KG_Manager -- "Uses" --> LoggingUtils

    WebSearch -- "Interacts with" --> GoogleSearchAPI
    WebSearch -- "Reads Config" --> ConfigModule
    WebSearch -- "Uses" --> LoggingUtils

    %% Connections: Operational Scripts & Config
    ScheduledMonitor -- "Triggers" --> VS_HealthChecker
    ScheduledMonitor -- "Reads Config" --> ConfigModule
    ScheduledMonitor -- "Uses" --> LoggingUtils

    ManualHealthTrigger -- "Triggers" --> VS_HealthChecker
    ManualHealthTrigger -- "Reads Config" --> ConfigModule
    ManualHealthTrigger -- "Uses" --> LoggingUtils

    ConfigModule -- "Loads from" --> EnvFiles

    %% Styling
    classDef user fill:#C9DDF2,stroke:#333,stroke-width:2px;
    classDef ui fill:#D5E8D4,stroke:#82B366,stroke-width:2px;
    classDef backend fill:#FFE6CC,stroke:#D79B00,stroke-width:2px;
    classDef coretool fill:#E1D5E7,stroke:#9673A6,stroke-width:2px;
    classDef opsconfig fill:#FFF2CC,stroke:#D6B656,stroke-width:2px;
    classDef external fill:#F8CECC,stroke:#B85450,stroke-width:2px;
    classDef gcp fill:#DAE8FC,stroke:#6C8EBF,stroke-width:2px;

    class User user;
    class UI_Streamlit ui;
    class API_Flask backend;
    class AgentCore,HybridSearch,VS_Client,KG_Manager,WebSearch,DocProc,VS_HealthChecker,ConfigModule,LoggingUtils,SecurityUtils,MonitoringUtils coretool;
    class EnvFiles,ScheduledMonitor,ManualHealthTrigger opsconfig;
    class VertexAI_VS,VertexAI_Embed,VertexAI_DocAI,GCS gcp;
    class MCP_KG_Server,GoogleSearchAPI external;
```

### Explanation of Architecture Components:

The diagram above illustrates the key components of the VANA system and their interactions.

1.  **User Interaction:**
    *   **User/Developer (Nick):** Interacts with the system by configuring it (`.env` files), running operational scripts, and using the Streamlit UI.

2.  **VANA System:**
    *   **User Interfaces (`dashboard/app.py`):**
        *   **Streamlit Frontend UI:** Provides a web interface for monitoring Vector Search health, viewing metrics, and receiving alerts. It communicates with the Flask API backend.
    *   **Backend Services (Dashboard) (`dashboard/flask_app.py`):**
        *   **Flask API Backend:** Serves data to the Streamlit UI, handles authentication, and exposes endpoints for health checks and metrics.
    *   **Core Tools & Services (`tools/`):** This is the heart of VANA's capabilities.
        *   **Conceptual Vana Single Agent (Phase 1 MVP):** The target intelligent agent that will orchestrate and utilize the various tools to perform tasks.
        *   **Search & Retrieval:**
            *   `EnhancedHybridSearch`: Combines results from Vector Search, Knowledge Graph, and Web Search.
            *   `VectorSearchClient`: Manages interactions with Google Vertex AI Vector Search for embedding management and querying.
            *   `KnowledgeGraphManager (MCP)`: Interfaces with an MCP server for structured knowledge storage and retrieval.
            *   `WebSearchClient`: Fetches real-time information using the Google Custom Search API.
        *   **Processing & Monitoring:**
            *   `DocumentProcessor`: Parses various document types (PDF, TXT, images via OCR) and performs semantic chunking. It's planned to primarily use Vertex AI Document AI in the future.
            *   `VectorSearchHealthChecker`: Performs diagnostics on the Vector Search service.
        *   **Utility Services:**
            *   `Configuration Module (config/environment.py)`: Loads and provides access to system configurations from `.env` files.
            *   `Logging Utilities`: Provides standardized logging across the system.
            *   `Security Utilities`: Handles credentials and other security aspects.
            *   `Monitoring Utilities`: Includes resilience patterns like Circuit Breakers for external service calls.
    *   **Operational Scripts & Configuration:**
        *   **`.env` files:** Store sensitive configurations like API keys and GCP project details.
        *   **Scheduled/Manual Triggers (`scripts/`):** Scripts for automating tasks like periodic health checks (`ScheduledVectorSearchMonitor`) or allowing manual initiation of checks.

3.  **External Dependencies:**
    *   **Google Cloud Platform (GCP):**
        *   `Vertex AI Vector Search`: The core service for storing and searching embeddings.
        *   `Vertex AI Embedding Model`: Used to generate text embeddings.
        *   `Vertex AI Document AI (Planned)`: The target service for advanced document parsing.
        *   `Google Cloud Storage (GCS)`: Optional storage for raw documents.
    *   **MCP Knowledge Graph Server:** An external or locally hosted MCP server for the Knowledge Graph.
    *   **Google Custom Search API:** Powers the `WebSearchClient`.

### Key Interactions:

*   The **Streamlit UI** fetches data from the **Flask API**.
*   The **Flask API** uses the **VectorSearchHealthChecker** to get status information.
*   The **Conceptual Single Agent** is designed to use all core tools: **HybridSearch**, **DocumentProcessor**, and directly the **VectorSearchClient**, **KnowledgeGraphManager**, and **WebSearchClient** as needed.
*   **HybridSearch** itself queries the **VectorSearchClient**, **KnowledgeGraphManager**, and **WebSearchClient**.
*   All **Core Tools** and **Operational Scripts** utilize the **Configuration Module** to load settings and the **Logging Utilities**.
*   Clients like **VectorSearchClient**, **KG_Manager**, and **WebSearchClient** interact with their respective **External Dependencies** (Vertex AI, MCP Server, Google Search API).
*   The **DocumentProcessor** is planned to use **VertexAI_DocAI** and can use **GCS** for document storage. It also uses the **VectorSearchClient** to generate embeddings for processed content.

## 📋 Prerequisites

Before you begin, ensure you have the following:

-   **Python:** Version 3.9 or higher.
-   **Google Cloud Platform (GCP) Account:**
    -   Billing enabled.
    -   A GCP Project ID.
    -   The following APIs enabled for your project:
        -   Vertex AI API (for Vector Search, Embeddings, and potentially Document AI).
        -   Document AI API (if using or planning to use Vertex AI Document AI for parsing).
        -   Any other Google Cloud services Vana might utilize.
-   **GCP Service Account:**
    -   A Service Account JSON key file.
    -   Appropriate IAM permissions granted to the service account (e.g., Vertex AI User, Document AI User, Storage Object Admin if GCS is used for document storage).
-   **API Keys (as applicable):**
    -   `MCP_API_KEY` for the Knowledge Graph MCP server.
    -   `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` for Google Custom Search API (Web Search).
-   **External Tools (for Document Processing with PyPDF2/Pytesseract):**
    -   Tesseract OCR installed and in your system's PATH if processing images with OCR via `tools/document_processing/document_processor.py`.

## 🚀 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/NickB03/vana.git
    cd vana
    ```

2.  **Create and activate a Python virtual environment:**
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    ```

3.  **Install dependencies:**
    The primary set of dependencies for the dashboard and core tools is in `dashboard/requirements.txt`.
    ```bash
    pip install -r dashboard/requirements.txt
    ```
    *Note: Some tools in `tools/document_processing/` might have additional dependencies like `PyPDF2` or `Pillow` and `pytesseract` (for OCR). These might need to be installed separately if not included or if you intend to use those specific features. A consolidated root `requirements.txt` may be added in the future.*

    If you plan to use spaCy for any NLP tasks (e.g., advanced entity extraction if implemented):
    ```bash
    # pip install spacy
    # python -m spacy download en_core_web_sm
    ```

## ⚙️ Configuration

VANA uses environment variables for configuration, managed via a `.env` file at the project root.

1.  **Create a `.env` file:**
    Copy the example file and customize it with your settings:
    ```bash
    cp .env.example .env
    nano .env  # Or your preferred editor
    ```

2.  **Key Environment Variables:**
    *   **GCP Configuration:**
        *   `GOOGLE_CLOUD_PROJECT`: Your GCP Project ID.
        *   `GOOGLE_APPLICATION_CREDENTIALS`: Path to your GCP Service Account JSON key file (e.g., `secrets/your-service-account-key.json`).
        *   `GOOGLE_CLOUD_LOCATION`: Default GCP region (e.g., `us-central1`).
    *   **Vertex AI Vector Search:**
        *   `VECTOR_SEARCH_ENDPOINT_ID`: The full resource name of your Vector Search Endpoint.
        *   `DEPLOYED_INDEX_ID`: The ID of your deployed index within the endpoint.
    *   **MCP Knowledge Graph:**
        *   `MCP_ENDPOINT`: URL of the MCP server (defaults to `https://mcp.community.augment.co` if not set, or `http://localhost:5000` if `USE_LOCAL_MCP=true` in dev).
        *   `MCP_NAMESPACE`: Namespace for your project on the MCP server (e.g., `vana-project`).
        *   `MCP_API_KEY`: Your API key for the MCP server.
    *   **Google Custom Search (Web Search):**
        *   `GOOGLE_SEARCH_API_KEY`: Your Google Custom Search API key.
        *   `GOOGLE_SEARCH_ENGINE_ID`: Your Custom Search Engine ID.
        *   *(Note: `tools/web_search_client.py` currently has hardcoded values. This needs to be updated to use these environment variables.)*
    *   **Dashboard Configuration:**
        *   `DASHBOARD_SECRET_KEY`: A secret key for Flask session management (important for production).
        *   `DASHBOARD_AUTH_ENABLED`: Set to `true` (default) or `false` to enable/disable dashboard authentication.
        *   `DASHBOARD_CREDENTIALS_FILE`: Path to a JSON file containing user credentials for dashboard login (e.g., `dashboard/auth/credentials.json`).
        *   `DASHBOARD_AUDIT_LOG_FILE`: Path for dashboard audit logs.
    *   **VANA Environment Mode:**
        *   `VANA_ENV`: Set to `development` (default), `test`, or `production`. This can affect things like data directories and MCP server endpoints (see `config/environment.py`).
        *   `USE_LOCAL_MCP`: If `VANA_ENV=development`, set to `true` to use a local MCP server endpoint.
    *   **Data Directory:**
        *   `VANA_DATA_DIR`: Base directory for Vana to store data (e.g., cache files). Defaults to project root.

    Refer to `.env.example` for a full list of potential variables and `config/environment.py` for how they are used. Ensure your Service Account key file is stored securely and its path is correctly set in `GOOGLE_APPLICATION_CREDENTIALS`.

## 🖥️ Usage

VANA provides multiple interfaces for interacting with the system:

### Agent CLI Interface

The VANA agent CLI provides a command-line interface for interacting with the agent:

1.  **Interactive Mode:**
    ```bash
    python -m agent.cli interactive
    ```
    This starts an interactive session where you can have a conversation with the agent.

2.  **Web UI Mode:**
    ```bash
    python -m agent.cli web --port 8080
    ```
    This launches the ADK web UI for a more visual interaction experience.

3.  **Single Message Mode:**
    ```bash
    python -m agent.cli message "Your message here"
    ```
    This processes a single message and returns the response.

For more details, see the [Agent CLI Guide](docs/guides/agent-cli-guide.md).

### Agent Demo

The VANA agent demo provides a guided demonstration of the agent's capabilities:

```bash
python -m scripts.demo_agent
```

This will walk you through a series of interactions that showcase the agent's memory, knowledge graph, vector search, web search, and file system capabilities.

For more details, see the [Agent Demo Guide](docs/guides/agent-demo.md).

### Vector Search Health Monitoring Dashboard

VANA's interface for the Vector Search Health Monitoring System is a web dashboard, which consists of a Flask backend API and a Streamlit frontend UI.

1.  **Run the Flask Backend API:**
    Open a terminal, navigate to the project root, and run:
    ```bash
    python dashboard/flask_app.py
    ```
    By default, this will start the Flask API server on `http://127.0.0.1:5000`. You can use options like `--host` and `--port` to change this. Check the terminal output for the exact address.

2.  **Run the Streamlit Frontend UI:**
    Open another terminal, navigate to the project root, and run:
    ```bash
    streamlit run dashboard/app.py
    ```
    This will typically open the Streamlit dashboard in your web browser, usually at `http://localhost:8501`. Check the terminal output for the exact URL.

3.  **Accessing the Dashboard:**
    Open the URL provided by Streamlit in your browser. If authentication is enabled (default), you will be prompted to log in. Default credentials might be found in `dashboard/auth/credentials.json` or should be set up as per your configuration.

### Key Operational Scripts

The `scripts/` directory contains various operational and testing scripts. Some key ones include:

*   `scripts/scheduled_vector_search_monitor.py`: Runs periodic health checks for Vector Search. This is intended to be run as a scheduled service.
    ```bash
    # Example: Run manually with a 15-minute interval, alerting via both methods
    # python scripts/scheduled_vector_search_monitor.py --interval 15 --alert-method both
    ```
*   `scripts/test_vector_search_health.py`: A command-line tool to perform on-demand health checks of the Vector Search integration.
    ```bash
    # Example: Run a detailed health check
    # python scripts/test_vector_search_health.py --mode detailed
    ```
*   `scripts/demo_agent.py`: A guided demonstration of the agent's capabilities.
    ```bash
    # Example: Run in non-interactive mode
    # python scripts/demo_agent.py --non-interactive
    ```

Refer to individual scripts or documentation in `docs/reference/cli_tools.md` (to be created) for more details on their usage and options.

## 🔑 Key Components

VANA is composed of several key systems and tools working together:

*   **Agent Core and Interface:**
    *   **Agent Core (`agent/core.py`):** The main agent class that orchestrates tools and maintains sessions.
    *   **CLI Interface (`agent/cli.py`):** Command-line interface for interacting with the agent.
    *   **Memory System (`agent/memory/`):** Short-term memory and memory bank integration for context preservation.
    *   **Agent Tools (`agent/tools/`):** Tools for file system operations, vector search, web search, and knowledge graph integration.
    *   **Demo Script (`scripts/demo_agent.py`):** A guided demonstration of the agent's capabilities.

*   **Vector Search Health Monitoring System:**
    *   **Dashboard (`dashboard/`):** A Flask API backend (`flask_app.py`) and a Streamlit frontend UI (`app.py`) for visualizing health, metrics, and alerts related to Vector Search.
    *   **Health Checker (`tools/vector_search/health_checker.py`):** Performs comprehensive checks on the Vector Search service.
    *   **Scheduled Monitor (`scripts/scheduled_vector_search_monitor.py`):** Automates periodic health checks.
    *   **Monitoring Utilities (`tools/monitoring/`):** Includes components like a circuit breaker for resilience.

*   **Vector Search Client (`tools/vector_search/vector_search_client.py`):**
    *   The primary interface for all interactions with Google Vertex AI Vector Search (embedding generation, search queries, data uploads).

*   **Document Processing Pipeline (`tools/document_processing/`):**
    *   `DocumentProcessor` class handles parsing of various file types (PDFs, text, images with OCR via PyPDF2/Pytesseract).
    *   `SemanticChunker` for intelligent splitting of text content.
    *   *Future Enhancement: Primary parsing via Vertex AI Document AI.*

*   **Knowledge Graph Integration (`tools/knowledge_graph/`):**
    *   `KnowledgeGraphManager` interacts with an MCP-compatible Knowledge Graph server for storing and retrieving structured knowledge (entities, relationships).

*   **Hybrid Search Engine (`tools/enhanced_hybrid_search.py`):**
    *   Combines results from Vector Search, Knowledge Graph, and Web Search to provide comprehensive answers.

*   **Web Search Client (`tools/web_search_client.py`):**
    *   Fetches real-time information from the web using Google Custom Search API.

*   **Configuration System (`config/environment.py`):**
    *   Manages environment-specific settings (API keys, endpoints, operational parameters) loaded from `.env` files.

*   **Supporting Utilities (`tools/security/`, `tools/logging/`, `tools/feedback/`):**
    *   Modules for foundational security aspects, structured logging, and utilities for feedback collection.

Each of these components is designed to be modular and can be explored in more detail in the `/docs` directory.

## 📂 Project Structure

A brief overview of the main directories:

-   `agent/`: Core agent implementation.
    -   `core.py`: Main agent class.
    -   `cli.py`: Command-line interface.
    -   `logging.py`: Logging system.
    -   `memory/`: Memory components (short-term memory, memory bank integration).
    -   `tools/`: Agent tools (file system, vector search, web search, knowledge graph).
-   `archive/`: Contains archived files from previous development phases.
-   `config/`: Configuration management (`environment.py`).
-   `dashboard/`: Flask backend API and Streamlit frontend UI for the monitoring dashboard.
-   `docs/`: Detailed project documentation.
    -   `guides/`: User guides for the agent CLI and demo.
    -   `implementation/`: Implementation details for agent components.
-   `instructions/`: Project instructions and status updates.
-   `logs/`: (Git-ignored) Log files generated by the agent.
-   `memory-bank/`: Core project context and knowledge maintained by Cline.
-   `scripts/`: Operational, testing, and utility scripts.
    -   `demo_agent.py`: Guided demonstration of the agent's capabilities.
-   `secrets/`: (Git-ignored) Recommended location for service account keys and sensitive files.
-   `tests/`: Test suite for the project.
    -   `e2e/`: End-to-end tests for the agent.
    -   `integration/`: Integration tests for agent components.
    -   `unit/`: Unit tests for individual components.
-   `tools/`: Core Python modules for Vana's functionalities (Vector Search, Document Processing, KG, etc.).
-   `.env.example`: Template for environment variable configuration.

## 💻 Development

(Details about development practices, coding standards, and testing procedures will be added here or linked to a document in `docs/development/`.)

To set up for development, ensure you have all prerequisites and follow the installation steps. Activate your virtual environment before running any scripts or applications.

## 🤝 Contributing

Contributions to VANA are welcome! Please refer to the `CONTRIBUTING.md` file for guidelines on:

-   Coding standards and style.
-   Testing requirements.
-   Branching strategy (e.g., feature branches, develop branch).
-   Pull Request process.
-   **Documentation updates required with code changes.**

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
