# VANA Documentation Overhaul - Structured Plan

This document outlines the structured plan for completing the VANA project documentation overhaul, based on the progress made as of 2025-05-16.

## Phase 1: Finalize Core Project Onboarding Documents

**Objective:** Ensure the primary entry points for understanding and using VANA are complete and accurate.

1.  **Root `README.md` Finalization:**
    *   **Task 1.1:** Create a detailed architecture diagram (e.g., using Mermaid or an embedded image) illustrating the interaction of current Vana components (Flask API, Streamlit UI, `tools/` services, conceptual single agent).
    *   **Task 1.2:** Write the comprehensive "Architecture" section in `README.md`, explaining the diagram and high-level component roles.
    *   **Task 1.3:** Review and refine all other sections of `README.md` for clarity, accuracy, and completeness.

## Phase 2: Detailed Documentation Content Population & Review (`docs/` Subdirectories)

**Objective:** Populate all necessary detailed documentation within the `docs/` subdirectory structure, ensuring accuracy and comprehensive coverage of current Vana systems.

1.  **Content Creation for Placeholder Files:**
    *   **Task 2.1.1 (`docs/architecture/`):**
        *   Write content for `vector_search_monitoring.md`.
        *   Write content for `knowledge_graph_integration.md`.
        *   Write content for `hybrid_search.md`.
        *   Write content for `security_overview.md`.
        *   Write content for `configuration_management.md`.
        *   (Ensure `overview.md` is fully updated based on Task 1.1 & 1.2).
    *   **Task 2.1.2 (`docs/guides/`):**
        *   Write content for `installation-guide.md`.
        *   Write content for `running-dashboard.md`.
        *   Write content for `vector-search-client-usage.md`.
        *   Write content for `vector-search-health-reports.md`.
        *   Write content for `document-processor-usage.md`.
        *   Write content for `preparing-documents-ingestion.md`.
        *   Write content for `kg-manager-usage.md`.
        *   Write content for `hybrid-search-usage.md`.
        *   Write content for `web-search-usage.md`.
        *   Write content for `scheduled-tasks.md`.
        *   Write content for `interpreting-logs.md`.
        *   Write content for `adding-new-tool.md`.
        *   Write content for `extending-dashboard.md`.
    *   **Task 2.1.3 (`docs/implementation/`):**
        *   Write content for `dashboard-flask-api.md`.
        *   Write content for `dashboard-streamlit-ui.md`.
        *   Write content for `enhanced-hybrid-search.md`.
        *   Write content for `current-memory-tools.md`.
        *   Write content for `config-environment.md`.
        *   Write content for `logging-system.md`.
        *   Write content for `resilience-patterns.md`.
2.  **Content Review and Update for Existing Kept Documents:**
    *   **Task 2.2.1:** Thoroughly review and update `docs/guides/security-integration.md`.
    *   **Task 2.2.2:** Thoroughly review and update `docs/implementation/kg-manager.md`.
    *   **Task 2.2.3:** Thoroughly review and update `docs/implementation/vector-search-client.md`.
    *   **Task 2.2.4:** Thoroughly review and update `docs/implementation/vector-search-health-checker.md`.
    *   **Task 2.2.5:** Thoroughly review and update `docs/implementation/vector-search-health-monitoring.md`.
    *   **Task 2.2.6:** Thoroughly review and update `docs/implementation/vector-search.md`.
    *   **Task 2.2.7:** Thoroughly review and update `docs/implementation/web-search.md`.
    *   **Task 2.2.8:** Review and update `docs/guides/dashboard-guide.md`.
    *   **Task 2.2.9:** Review and update `docs/guides/knowledge-graph-commands.md`.
    *   **Task 2.2.10:** Review and update `docs/guides/web-search-configuration.md`.
    *   **Task 2.2.11:** Review and update `docs/document-processing-strategy.md` (ensure note on current vs. planned is clear and other content is aligned).
3.  **Audit and Update Remaining `docs/` Subdirectories:**
    *   **Task 2.3.1 (`docs/api/`):**
        *   Create/update `index.md`.
        *   Create `flask-api-endpoints.md`.
        *   Create/update `python-api-reference.md` (or decide on auto-generation strategy e.g. Sphinx).
    *   **Task 2.3.2 (`docs/project/`):**
        *   Create/update `index.md`.
        *   Update `roadmap.md` to reflect current Phase 1 MVP and Phase 2 MAS goals.
        *   Ensure `CHANGELOG.md` (currently in root of `docs/`) is actively maintained and correctly linked.
    *   **Task 2.3.3 (`docs/troubleshooting/`):**
        *   Create/update `index.md`.
        *   Review/update `common-issues.md`.
        *   Review/update `vector-search-issues.md`.
    *   **Task 2.3.4 (`docs/integrations/`):**
        *   Create/update `index.md`.
        *   Remove outdated integration docs (n8n, Agent Engine).
        *   Create/update docs for current integrations: MCP (for KG) and Vertex AI (Vector Search, Embeddings, planned Document AI).
    *   **Task 2.3.5 (`docs/development/`):**
        *   Create/update `index.md`.
        *   Populate with development workflow, coding standards, testing strategy details (or link to `CONTRIBUTING.md`).
    *   **Task 2.3.6 (`docs/templates/`):**
        *   Review relevance of existing templates. Archive or update as needed.

## Phase 3: Technical Debt & Final Polish

**Objective:** Address outstanding technical items related to documentation and ensure overall quality.

1.  **Code Improvement Recommendation Follow-up:**
    *   **Task 3.1:** Formally document the need to fix the hardcoded API key in `tools/web_search_client.py`. This could involve creating a GitHub issue and linking to it from relevant documentation sections (e.g., `docs/implementation/web-search.md` and `docs/guides/web-search-configuration.md`).
2.  **`requirements.txt` Consolidation:**
    *   **Task 3.2:** Analyze dependencies in `dashboard/requirements.txt` and any other implicit dependencies for `tools/` components.
    *   **Task 3.3:** Create a consolidated root `requirements.txt` file.
    *   **Task 3.4:** Update `README.md` and relevant setup guides to use the new root `requirements.txt`.
3.  **Final Review & Consistency Check:**
    *   **Task 3.5:** Perform a full review of all documentation for consistency in terminology, formatting, and linking.
    *   **Task 3.6:** Validate all internal links within the documentation.

## Ongoing Tasks:

*   **Continuous `memory-bank/` Updates:** Keep `activeContext.md` and `progress.md` current throughout this process.
*   **Adherence to `CONTRIBUTING.md`:** Ensure all documentation changes follow the established contribution guidelines (once finalized).

This structured plan will guide the completion of the VANA documentation overhaul.
