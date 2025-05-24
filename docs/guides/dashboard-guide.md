# VANA Monitoring Dashboard User Guide

[Home](../../index.md) > [Guides](./index.md) > Monitoring Dashboard Guide

The VANA Monitoring Dashboard provides visualization and monitoring capabilities, primarily focused on the **Vector Search Health Monitoring System**. It is built with a Flask backend API and a Streamlit frontend UI.

## Core Purpose (Current Focus)

The dashboard's main function in the current VANA system is to:
-   Display the health status of the Google Vertex AI Vector Search integration.
-   Show performance metrics related to Vector Search.
-   Provide historical data and trends for Vector Search health.
-   Offer actionable recommendations if issues are detected by the `VectorSearchHealthChecker`.

*Note: The Streamlit dashboard (`dashboard/app.py`) includes navigation links for other sections like "Agent Status," "Memory Usage," and "Task Execution." These appear to be remnants from a previous ADK-based agent system. Their functionality and data sources are likely outdated or non-operational in the current VANA architecture. The **"System Health" page (or similarly named page for Vector Search monitoring) is the primary, functional part of the dashboard relevant to the current system.** *

## Prerequisites

-   Ensure VANA is installed and configured as per the [Installation Guide](installation-guide.md).
-   The Flask backend API and the Streamlit application must both be running. See [Running the Dashboard](running-dashboard.md).

## Installation & Setup

For detailed installation and setup instructions for VANA, including dependencies and environment configuration for the dashboard components, please refer to:
-   [VANA Installation Guide](installation-guide.md)
-   [Configuration Section in README.md](../../README.md#%EF%B8%8F-configuration)

**Key Configuration Points for the Dashboard:**
*   The **Flask API backend** (`dashboard/flask_app.py`) relies on environment variables in your project's root `.env` file (e.g., `DASHBOARD_SECRET_KEY`, `DASHBOARD_AUTH_ENABLED`, GCP settings for the health checker it uses).
*   The **Streamlit frontend UI** (`dashboard/app.py`) communicates with this Flask API. Ensure any API endpoint URLs used by Streamlit components correctly point to your running Flask API (typically `http://localhost:5000/api/...`).
*   The file `dashboard/config.json` appears to contain outdated configurations related to a previous system and should generally be disregarded for the current Vector Search monitoring functionality, which sources its data via the Flask API.

## Running the Dashboard

To run the dashboard, both the Flask backend and the Streamlit frontend must be started. Detailed instructions are in the [Running the Dashboard Guide](running-dashboard.md).

**Quick Summary:**
1.  **Start Flask API:** `python dashboard/flask_app.py` (usually on `http://127.0.0.1:5000`)
2.  **Start Streamlit UI:** `streamlit run dashboard/app.py` (usually on `http://localhost:8501`)

## Using the Dashboard

### Access and Authentication
-   Open the URL provided by Streamlit (e.g., `http://localhost:8501`) in your web browser.
-   If dashboard authentication is enabled (default via `DASHBOARD_AUTH_ENABLED` in `.env`), you will be prompted to log in. Credentials are typically managed in a JSON file specified by `DASHBOARD_CREDENTIALS_FILE` (see Flask API configuration).

### Key Pages & Interpretation (Focus on Vector Search Health)

The primary functional page related to the current VANA system is typically titled **"System Health"** or similar, focusing on Vector Search monitoring.

*   **Vector Search Health Overview:**
    *   **Current Status:** Displays an overall health status (e.g., HEALTHY, WARN, ERROR) of the Vector Search service, as determined by `VectorSearchHealthChecker`.
    *   **Key Metrics:** May show recent query latency, success rates, or other relevant performance indicators.
    *   For details on interpreting these statuses and metrics, see [Interpreting Vector Search Health Reports Guide](vector-search-health-reports.md).
*   **Detailed Checks:** Often, a breakdown of individual checks performed by `VectorSearchHealthChecker` is available, showing the status of each (e.g., connectivity, sample query, index status).
*   **Historical Performance (if implemented):**
    *   Charts and graphs showing trends for metrics like query latency, error rates, or uptime over selected periods (e.g., last hour, last 24 hours). This data is fetched from the Flask API, which might store or compute it.
*   **Actionable Recommendations:**
    *   If the `VectorSearchHealthChecker` detects issues, the dashboard should display any actionable recommendations provided (e.g., "Verify GOOGLE_APPLICATION_CREDENTIALS path," "Index appears empty, consider uploading data").
*   **Resource Usage (Host System):**
    *   Some dashboard views might display CPU, memory, and disk usage. Note that this typically reflects the resource usage of the *machine running the VANA dashboard components*, not necessarily the Vertex AI service itself.

*   **Other Pages (Agent Status, Memory Usage, Task Execution, etc.):**
    *   As previously mentioned, these pages are likely **not functional or relevant** to the current VANA architecture. They may display mock data or attempt to connect to outdated/non-existent services. Focus on the Vector Search health monitoring sections.

## Development and Data Flow Notes

*   **UI Components:** The Streamlit UI is built using Python scripts, often located in `dashboard/frontend/pages/` for multi-page apps, and may use reusable components from `dashboard/frontend/components/`.
*   **Data Sourcing for Vector Search Health:**
    1.  A Streamlit page (e.g., `dashboard/frontend/pages/vector_search_health_page.py`) contains Python code that uses the `requests` library to call API client functions (e.g., defined in `dashboard/frontend/utils/api_client.py`).
    2.  These client functions make HTTP requests to specific endpoints on the **Flask API backend** (e.g., `/api/vs/health`).
    3.  The Flask API route handlers (e.g., in `dashboard/api/vector_search_routes.py`) process these requests.
    4.  The route handlers typically instantiate or use an existing instance of `tools.vector_search.health_checker.VectorSearchHealthChecker` to get the latest health data.
    5.  The Flask API returns this data as a JSON response.
    6.  The Streamlit page receives the JSON and uses Streamlit's functions (`st.metric`, `st.line_chart`, `st.dataframe`, etc.) to visualize it.

For extending the dashboard, refer to the [Extending the VANA Monitoring Dashboard Guide](extending-dashboard.md).
