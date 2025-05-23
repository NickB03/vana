# VANA Documentation

Welcome to the VANA project documentation. This site provides comprehensive information about VANA's architecture, components, setup, usage, and development.

## I. Getting Started
- **[Project Overview](../../README.md)** (Root README)
- **[Installation Guide](guides/installation-guide.md)**
- **[Configuration Guide](guides/web-search-configuration.md)** (General configuration is in Installation Guide and README; this specific link might need to be a more general config guide or part of Installation)
    *   For `.env` details, see [Configuration System Implementation](implementation/config-environment.md).
- **[Running the Dashboard](guides/running-dashboard.md)**
- **[Using the VANA Agent](guides/agent-usage.md)**
    * [Agent CLI Guide](guides/agent-cli-guide.md)
    * [Agent Demo Guide](guides/agent-demo.md)

## II. System Architecture
- **[Overall Architecture](architecture/index.md)**
    - [System Overview](architecture/overview.md)
    - [Agent Core Architecture](architecture/agent-core.md)
    - [Vector Search Monitoring System Architecture](architecture/vector_search_monitoring.md)
    - [Knowledge Graph Integration Architecture](architecture/knowledge_graph_integration.md)
    - [Hybrid Search Architecture](architecture/hybrid_search.md)
    - [Security Overview](architecture/security_overview.md)
    - [Configuration Management Architecture](architecture/configuration_management.md)
- **[Document Processing Strategy](document-processing-strategy.md)**

## III. User & Developer Guides
- **[All Guides](guides/index.md)**
- **Agent Guides:**
    - [Agent Usage Guide](guides/agent-usage.md)
    - [Agent CLI Guide](guides/agent-cli-guide.md)
    - [Agent Demo Guide](guides/agent-demo.md)
    - [Agent Tool Usage Guide](guides/agent-tool-usage.md)
- **Monitoring Dashboard:**
    - [VANA Monitoring Dashboard User Guide](guides/dashboard-guide.md)
    - [Interpreting Vector Search Health Reports](guides/vector-search-health-reports.md)
    - [Extending the VANA Monitoring Dashboard](guides/extending-dashboard.md)
- **Core Tools Usage:**
    - [Using the VectorSearchClient](guides/vector-search-client-usage.md)
    - [Using the DocumentProcessor](guides/document-processor-usage.md)
    - [Preparing Documents for Ingestion](guides/preparing-documents-ingestion.md)
    - [Using the KnowledgeGraphManager](guides/kg-manager-usage.md)
    - [Using EnhancedHybridSearch](guides/hybrid-search-usage.md)
    - [Using WebSearchClient](guides/web-search-usage.md)
    - [Conceptual Knowledge Graph Commands](guides/knowledge-graph-commands.md)
- **Operational Guides:**
    - [Running Scheduled Tasks](guides/scheduled-tasks.md)
    - [Interpreting VANA Logs](guides/interpreting-logs.md)
- **Development Guides:**
    - [VANA Development Guide](development/index.md)
    - [Adding a New Tool to VANA](guides/adding-new-tool.md)
    - [Security Integration Guide](guides/security-integration.md)

## IV. Implementation Details
- **[All Implementation Docs](implementation/index.md)**
- **Agent Components:**
    - [Agent Core Implementation](implementation/agent-core.md)
    - [Agent Memory Implementation](implementation/agent-memory.md)
    - [Agent CLI Implementation](implementation/agent-cli.md)
    - [Agent Logging System Implementation](implementation/agent-logging.md)
- **Core Tools:**
    - [VectorSearchClient Implementation](implementation/vector-search-client.md)
    - [VectorSearchHealthChecker Implementation](implementation/vector-search-health-checker.md)
    - [DocumentProcessor Implementation](implementation/document-processor.md) (Focus on PyPDF2/Pytesseract)
    - [KnowledgeGraphManager Implementation](implementation/kg-manager.md)
    - [EnhancedHybridSearch Implementation](implementation/enhanced-hybrid-search.md)
    - [WebSearchClient Implementation](implementation/web-search.md)
- **Systems & Utilities:**
    - [Vector Search Subsystem Overview](implementation/vector-search.md)
    - [Vector Search Health Monitoring System Overview](implementation/vector-search-health-monitoring.md)
    - [Dashboard Flask API Implementation](implementation/dashboard-flask-api.md)
    - [Dashboard Streamlit UI Implementation](implementation/dashboard-streamlit-ui.md)
    - [Configuration System Implementation (`config/environment.py`)](implementation/config-environment.md)
    - [Logging System Implementation](implementation/logging-system.md)
    - [Resilience Patterns Implementation](implementation/resilience-patterns.md)

## V. API Reference
- **[API Documentation Index](api/index.md)**
    - [Dashboard Flask API Endpoints](api/flask-api-endpoints.md)
    - [Python API Reference (Core Tools)](api/python-api-reference.md) (Overview, links to docstrings/source)

## VI. Project Management & Contribution
- **[Project Documentation Index](project/index.md)**
    - [Project Roadmap](project/roadmap.md)
    - [CHANGELOG](CHANGELOG.md)
- **[Contributing Guidelines](../../CONTRIBUTING.md)** (Root `CONTRIBUTING.md`)
- **[License](../../LICENSE)** (Root `LICENSE`)

## VII. Troubleshooting
- **[Troubleshooting Index](troubleshooting/index.md)**
    - [Common Issues in VANA](troubleshooting/common-issues.md)
    - [Troubleshooting Vector Search Issues](troubleshooting/vector-search-issues.md)

## VIII. Archived Documentation
- **[Archive Index](archive/index.md)** (For legacy systems & previous sprint documentation)
