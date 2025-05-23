# Troubleshooting VANA Dashboard Issues

[Home](../../index.md) > [Troubleshooting](index.md) > Dashboard Issues

This document provides guidance for troubleshooting common problems encountered with the VANA Monitoring Dashboard, which includes a Flask API backend and a Streamlit frontend UI.

## Common Issue Categories

### 1. Flask API Backend Not Starting or Crashing

*   **Symptom:** The `python dashboard/flask_app.py` command fails to start the server or exits unexpectedly. Errors in the terminal.
*   **Potential Causes & Solutions:**
    *   **Port Conflicts:** Port 5000 (or configured `FLASK_PORT`) might be in use. Try changing `FLASK_PORT` in `.env`.
    *   **Configuration Errors:** Missing or incorrect environment variables in `.env` (e.g., `DASHBOARD_SECRET_KEY`). Check terminal output for specific errors.
    *   **Dependency Issues:** Ensure all packages in `requirements.txt` are installed in the active virtual environment.
    *   **Syntax Errors in Code:** Review recent changes to `dashboard/flask_app.py` or related API/auth modules.
    *   *[Further details to be added based on common issues encountered.]*

### 2. Streamlit Frontend UI Not Loading or Displaying Errors

*   **Symptom:** The `streamlit run dashboard/app.py` command fails, the browser page shows an error, or the UI doesn't load correctly.
*   **Potential Causes & Solutions:**
    *   **Flask API Not Running:** The Streamlit UI depends on the Flask API. Ensure the Flask backend is running and accessible.
    *   **Incorrect API URL:** Streamlit pages might be configured to call an incorrect Flask API URL. Check `dashboard/frontend/utils/api_client.py` or similar.
    *   **Dependency Issues:** Ensure Streamlit and related packages are installed.
    *   **Syntax Errors in Streamlit Code:** Check terminal output from `streamlit run` and browser console for errors.
    *   **CORS Issues (Less Common on Localhost):** If API and UI are on different origins in a deployed environment.
    *   *[Further details to be added based on common issues encountered.]*

### 3. Data Not Displaying Correctly on Dashboard

*   **Symptom:** Dashboard pages load but show no data, incorrect data, or "Error fetching data" messages.
*   **Potential Causes & Solutions:**
    *   **Flask API Errors:** The Flask API endpoint might be returning errors. Check Flask API logs and test the endpoint directly (e.g., with `curl` or Postman).
    *   **`VectorSearchHealthChecker` Issues:** If data comes from `VectorSearchHealthChecker`, ensure it's functioning correctly (test via `scripts/test_vector_search_health.py`).
    *   **Data Source Issues:** The underlying data source (e.g., Vector Search service, stored historical data) might be unavailable or empty.
    *   **API Client Logic in Streamlit:** Errors in `dashboard/frontend/utils/api_client.py` when calling or parsing Flask API responses.
    *   *[Further details to be added based on common issues encountered.]*

### 4. Authentication Problems

*   **Symptom:** Unable to log in to the dashboard, "Invalid credentials," "Token expired," or unauthorized access errors.
*   **Potential Causes & Solutions:**
    *   **Incorrect Credentials:** Verify username/password against `DASHBOARD_CREDENTIALS_FILE`.
    *   **`DASHBOARD_AUTH_ENABLED`:** Check this setting in `.env`.
    *   **`DASHBOARD_SECRET_KEY`:** Ensure it's set for token/session management.
    *   **Token Handling Logic:** Issues in `dashboard/auth/auth.py` (Flask) or `dashboard/frontend/utils/auth_utils.py` (Streamlit).
    *   *[Further details to be added based on common issues encountered.]*

## General Troubleshooting Steps

1.  **Consult VANA Logs:** Check logs from `dashboard/flask_app.py` (terminal or file) and `streamlit run dashboard/app.py` (terminal). See [Interpreting VANA Logs Guide](../guides/interpreting-logs.md).
2.  **Browser Developer Console:** Open your browser's developer tools (usually F12) and check the "Console" and "Network" tabs for errors when viewing the Streamlit UI.
3.  **Verify Configuration:** Ensure all dashboard-related and underlying service configurations in `.env` are correct.
4.  **Test API Endpoints Directly:** Use `curl` or Postman to test the Flask API endpoints that the Streamlit UI calls. This helps isolate backend vs. frontend issues.
5.  **Simplify:** If a complex page isn't working, try creating a minimal Streamlit page that calls a single, simple Flask API endpoint to test basic connectivity.
6.  **Refer to Documentation:**
    *   [Running the Dashboard Guide](../guides/running-dashboard.md)
    *   [Dashboard Flask API Implementation](../implementation/dashboard-flask-api.md)
    *   [Dashboard Streamlit UI Implementation](../implementation/dashboard-streamlit-ui.md)
    *   [Extending the VANA Monitoring Dashboard Guide](../guides/extending-dashboard.md)

*[This document is a placeholder. More specific troubleshooting steps will be added as common issues are identified and resolved.]*
