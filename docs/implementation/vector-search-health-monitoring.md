# Vector Search Health Monitoring System Implementation

[Home](../../index.md) > [Implementation](./index.md) > Vector Search Health Monitoring System

This document provides an overview of the VANA Vector Search Health Monitoring System, detailing its constituent components, their setup, and how they are used to monitor the Google Cloud Vertex AI Vector Search integration.

For a high-level architectural diagram, see [Vector Search Monitoring Architecture](../architecture/vector_search_monitoring.md).

## System Components

The monitoring system is comprised of several key VANA components working in concert:

1.  **`VectorSearchHealthChecker` (`tools/vector_search/health_checker.py`)**
    *   The core engine that performs a suite of diagnostic tests against the Vector Search service.
    *   It uses the `VectorSearchClient` for actual interactions with Vertex AI.
    *   Generates a structured health report including status, metrics, and potential recommendations.
    *   Detailed in [Vector Search Health Checker Implementation](vector-search-health-checker.md).

2.  **`VectorSearchClient` (`tools/vector_search/vector_search_client.py`)**
    *   The low-level client used by the `VectorSearchHealthChecker` to make calls to Vertex AI (e.g., perform sample queries, get index details).
    *   Detailed in [Vector Search Client Implementation](vector-search-client.md).

3.  **Scheduled Health Monitor Script (`scripts/scheduled_vector_search_monitor.py`)**
    *   A Python script designed to run `VectorSearchHealthChecker` periodically (e.g., via `cron` or another scheduler).
    *   Logs health reports.
    *   Can be configured for basic alerting (e.g., logging errors, writing to alert files).
    *   May store historical health data (depending on implementation) for trend analysis.
    *   Setup detailed in the [Scheduled Tasks Guide](../guides/scheduled-tasks.md).

4.  **On-Demand Health Check Script (`scripts/test_vector_search_health.py`)**
    *   A command-line tool that allows users to manually trigger health checks using `VectorSearchHealthChecker`.
    *   Useful for ad-hoc diagnostics and troubleshooting.
    *   Outputs results to the console or a specified report file.

5.  **Monitoring Dashboard (Flask API Backend & Streamlit Frontend UI)**
    *   **Flask API Backend (`dashboard/flask_app.py` and `dashboard/api/vector_search_routes.py`):**
        *   Exposes API endpoints (e.g., `/api/vs/health`) that the Streamlit UI calls to get current or historical health data.
        *   The API, in turn, may use `VectorSearchHealthChecker` to get live data or retrieve stored reports.
        *   Detailed in [Dashboard Flask API Implementation](dashboard-flask-api.md).
    *   **Streamlit Frontend UI (`dashboard/app.py` and `dashboard/frontend/pages/`):**
        *   Provides a web-based visual interface.
        *   Displays health status, metrics, historical trends, and recommendations.
        *   Pulls data by making requests to the Flask API.
        *   Detailed in [Dashboard Streamlit UI Implementation](dashboard-streamlit-ui.md).

## Setup and Configuration

Setting up the full monitoring system involves configuring each of its parts:

1.  **Prerequisites:**
    *   Python 3.9+ installed.
    *   All dependencies from `dashboard/requirements.txt` (and any other relevant `requirements.txt` files) installed within an active virtual environment. This includes Flask, Streamlit, google-cloud-aiplatform, etc.
    *   See the [Installation Guide](../guides/installation-guide.md) for general VANA setup.

2.  **Environment Variables (`.env` file):**
    *   Crucial for all components that interact with GCP. Ensure the following are correctly set:
        *   `GOOGLE_CLOUD_PROJECT`
        *   `GOOGLE_CLOUD_LOCATION`
        *   `VECTOR_SEARCH_ENDPOINT_ID`
        *   `DEPLOYED_INDEX_ID`
        *   `GOOGLE_APPLICATION_CREDENTIALS` (path to your service account key file)
    *   Dashboard-specific configurations (e.g., `DASHBOARD_AUTH_ENABLED`, `DASHBOARD_SECRET_KEY`).
    *   Logging configurations (e.g., `LOG_LEVEL`, `LOG_FILE_PATH`).
    *   Refer to `config/environment.py` and `.env.example` for a comprehensive list.

3.  **Component-Specific Setup:**
    *   **`VectorSearchClient` and `VectorSearchHealthChecker`:** These are Python classes and are configured primarily via the environment variables loaded by `config.environment`. No separate setup beyond ensuring dependencies and `.env` are correct.
    *   **Scheduled Monitor Script:** Requires setting up a system scheduler (like `cron` on Linux/macOS or Task Scheduler on Windows) to run `scripts/scheduled_vector_search_monitor.py` at desired intervals. See the [Scheduled Tasks Guide](../guides/scheduled-tasks.md).
    *   **Dashboard:**
        *   The Flask API backend needs to be running.
        *   The Streamlit UI application needs to be running.
        *   See the [Running the Dashboard Guide](../guides/running-dashboard.md).

## Usage Flow

1.  **Automated Monitoring:**
    *   The `scheduled_vector_search_monitor.py` script is triggered by the system scheduler.
    *   It instantiates `VectorSearchHealthChecker` and calls `perform_checks()`.
    *   The health report is logged. If configured, alerts are generated for significant issues.
    *   Historical data might be saved to a file or simple database (depending on the script's features).

2.  **Manual Health Checks:**
    *   A user runs `python scripts/test_vector_search_health.py` with desired options (e.g., `--mode detailed`).
    *   The script uses `VectorSearchHealthChecker` to perform checks and prints the report to the console or a file.

3.  **Dashboard Visualization:**
    *   User accesses the Streamlit UI in a web browser.
    *   The Streamlit page (e.g., for Vector Search health) makes an HTTP request to the Flask API (e.g., `/api/vs/health`).
    *   The Flask API endpoint handler receives the request. It might:
        *   Retrieve the latest stored health report.
        *   Or, trigger a live health check by calling `VectorSearchHealthChecker.perform_checks()`.
    *   The Flask API returns the health data as a JSON response.
    *   The Streamlit UI receives the JSON data and renders it using charts, metrics, tables, etc.

## Health Check Details, Alerts, and Reports

*   **Health Check Details:** For specifics on what individual checks are performed by `VectorSearchHealthChecker` (e.g., environment, authentication, embedding, search checks), refer to its implementation document: [Vector Search Health Checker Implementation](vector-search-health-checker.md).
*   **Interpreting Reports:** For guidance on understanding the health reports (overall status, metrics, recommendations), see [Interpreting Vector Search Health Reports Guide](../guides/vector-search-health-reports.md).
*   **Alerts and Notifications:** The `scheduled_vector_search_monitor.py` script may implement basic alerting (e.g., logging errors). More advanced alerting (email, Slack) would require additional implementation or integration with external alerting systems.
*   **Historical Data & Trend Analysis:** The system's capability for storing and analyzing historical data depends on the implementation of the scheduled monitor and the Flask API. Simple implementations might store reports as JSON files, while more advanced ones could use a time-series database. The dashboard would then query this data via the API for trend visualization.

## Troubleshooting the Monitoring System

If issues arise with the monitoring system itself:
1.  **Check Component Logs:** Examine logs from `flask_app.py`, `streamlit run dashboard/app.py`, and the output of `scheduled_vector_search_monitor.py` (or its cron log file). Refer to the [Interpreting VANA Logs Guide](../guides/interpreting-logs.md).
2.  **Verify Configurations:** Double-check all relevant environment variables in `.env`.
3.  **Test Components Individually:**
    *   Run `scripts/test_vector_search_health.py` to see if the core checker works.
    *   Test Flask API endpoints directly using `curl` or Postman.
    *   Run the Streamlit app and check browser console for errors if UI issues occur.
4.  **Permissions:** Ensure the GCP service account has the necessary permissions for Vertex AI operations.
5.  **Dependencies:** Confirm all Python packages are correctly installed in the active virtual environment.

## Future Enhancements

## Future Enhancements

Planned enhancements for the monitoring system:

1. **Email/Slack Notifications**: Direct notifications for critical issues
2. **Advanced Anomaly Detection**: ML-based detection of unusual patterns
3. **Predictive Maintenance**: Predict issues before they occur
4. **Custom Check Extensions**: Allow custom health checks to be added
5. **Multi-Environment Support**: Monitor multiple Vector Search environments
