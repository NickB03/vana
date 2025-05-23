# Running the VANA Monitoring Dashboard

[Home](../../index.md) > [Guides](../index.md) > Running the Dashboard

This guide explains how to run the VANA Vector Search Health Monitoring Dashboard. The dashboard consists of two main parts: a Flask backend API and a Streamlit frontend UI. Both need to be running simultaneously for the dashboard to function.

## 1. Prerequisites

*   **VANA Installation:** Ensure you have successfully completed all steps in the [Installation Guide](installation-guide.md).
*   **Virtual Environment:** Your Python virtual environment (`.venv`) must be activated.
    ```bash
    # On macOS/Linux
    source .venv/bin/activate
    # On Windows (Cmd)
    # .venv\Scripts\activate.bat
    # On Windows (PowerShell)
    # .venv\Scripts\Activate.ps1
    ```
*   **Configuration:** Your `.env` file must be correctly configured with all necessary settings, especially those related to GCP, Vector Search, and dashboard authentication (if enabled). See the [Configuration section in the main README.md](../../README.md#%EF%B8%8F-configuration).

## 2. Running the Flask Backend API

The Flask API serves data to the Streamlit frontend and handles authentication.

1.  **Open a new terminal window or tab.**
    It's important to run the Flask API and Streamlit UI in separate terminal sessions so they can run concurrently.

2.  **Navigate to the VANA project root directory:**
    ```bash
    cd path/to/vana
    ```

3.  **Ensure your virtual environment is activated** in this new terminal session.

4.  **Start the Flask API server:**
    ```bash
    python dashboard/flask_app.py
    ```
    *   By default, the Flask server will start on `http://127.0.0.1:5000`.
    *   You should see output in the terminal indicating that the Flask development server is running, similar to:
        ```
         * Serving Flask app 'flask_app'
         * Debug mode: off  # Or on, depending on VANA_ENV or Flask settings
        WARNING: This is a development server. Do not use it in a production deployment.
        Use a production WSGI server instead.
         * Running on http://127.0.0.1:5000
        Press CTRL+C to quit
        ```
    *   **Custom Host/Port:** If you need to run the Flask API on a different host or port, you can often pass command-line arguments (this depends on how `flask_app.py` is structured to handle `app.run()`). For example, if it supports it:
        ```bash
        # python dashboard/flask_app.py --host 0.0.0.0 --port 5001
        ```
        Alternatively, these might be configurable via environment variables. Check `dashboard/flask_app.py` or related configuration if the default `127.0.0.1:5000` doesn't work for your setup.

5.  **Keep this terminal window open.** The Flask API needs to remain running for the dashboard to work.

## 3. Running the Streamlit Frontend UI

The Streamlit UI provides the web-based visual interface for the dashboard.

1.  **Open another new terminal window or tab.**

2.  **Navigate to the VANA project root directory:**
    ```bash
    cd path/to/vana
    ```

3.  **Ensure your virtual environment is activated** in this terminal session as well.

4.  **Start the Streamlit application:**
    ```bash
    streamlit run dashboard/app.py
    ```
    *   Streamlit will typically start the UI and automatically open it in your default web browser.
    *   The default URL is usually `http://localhost:8501`.
    *   You will see output in the terminal similar to:
        ```
        You can now view your Streamlit app in your browser.

        Local URL: http://localhost:8501
        Network URL: http://<your-local-ip>:8501
        ```

5.  **Keep this terminal window open.** The Streamlit application also needs to remain running.

## 4. Running with Production-like (Demo) Configuration

Phase D of the Vector Search Enhancement Plan introduced a production-like configuration for the dashboard, primarily for demonstration and systemd deployment scenarios. You can run the dashboard using this configuration.

1.  **Ensure `dashboard/config/demo.py` exists and is configured.** This file contains settings like `DEBUG = False`, a `SECRET_KEY`, and potentially authentication details for the demo.

2.  **Start the Flask API with the demo configuration:**
    Instead of the simple `python dashboard/flask_app.py`, you can specify the configuration when starting:
    ```bash
    python dashboard/flask_app.py --config demo
    ```
    *   This will instruct `flask_app.py` to load settings from `dashboard/config/demo.py`.
    *   The API might run on a different port or with different settings as defined in `demo.py` or overridden by environment variables.

3.  **Start the Streamlit UI as usual:**
    ```bash
    streamlit run dashboard/app.py
    ```
    The Streamlit UI should connect to the Flask API, which is now running with the demo configuration.

4.  **Accessing the Dashboard:**
    *   Access the Streamlit UI via its URL (e.g., `http://localhost:8501`).
    *   If `demo.py` enables authentication (i.e., `ENABLE_AUTH = True` is set, which is the default in `dashboard/config/demo.py`), you will be prompted to log in.
    *   Use the credentials defined in `dashboard/config/demo.py`. By default, these are:
        *   **Username:** `admin` (from `DEMO_USERNAME`)
        *   **Password:** `password` (from `DEMO_PASSWORD`)
    *   **Important:** The `demo.py` file is intended for demonstration and testing. The default password (`password`) is insecure and **must be changed** if you adapt `demo.py` for any persistent use. For more secure credential management, refer to the standard authentication setup using `DASHBOARD_CREDENTIALS_FILE`.

This method is particularly relevant when testing systemd service deployments, as the service files might be configured to launch the dashboard with such a named configuration.

## 5. Accessing and Using the Dashboard (Standard Development)

1.  **Open your web browser** and navigate to the "Local URL" provided by Streamlit (e.g., `http://localhost:8501`).
2.  **Login (if authentication is enabled):**
    *   If dashboard authentication is enabled (default behavior, controlled by `DASHBOARD_AUTH_ENABLED` in `.env`), you will be prompted to log in.
    *   Use the credentials defined in your `DASHBOARD_CREDENTIALS_FILE` (e.g., `dashboard/auth/credentials.json`).
3.  **Explore the Dashboard:**
    *   Once logged in, you should see the VANA Monitoring Dashboard interface.
    *   Navigate through the different sections to view Vector Search health status, performance metrics, historical data, and any alerts.

## 6. API Access and Authentication

The VANA dashboard provides API endpoints for programmatic access to monitoring data. These endpoints are secured with authentication to prevent unauthorized access.

### API Authentication Methods

1. **Session-based Authentication**: Used when accessing the API through the web UI
2. **API Key Authentication**: Recommended for programmatic access

### Using API Keys

To authenticate API requests programmatically, include your API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key-here" http://localhost:5000/api/vector-search/health
```

### Available API Endpoints

The dashboard exposes several API endpoints for monitoring and management:

- `/api/vector-search/health`: Get Vector Search health data
- `/api/agents`: Get agent status information
- `/api/memory/usage`: Get memory usage data
- `/api/system/health`: Get system health data
- `/api/tasks/summary`: Get task execution summary

For a complete list of endpoints and detailed documentation on API security, see the [API Security Guide](api-security.md).

## 7. Stopping the Dashboard

To stop the dashboard:

1.  Go to the terminal window where the **Flask API (`python dashboard/flask_app.py`)** is running and press `CTRL+C`.
2.  Go to the terminal window where the **Streamlit UI (`streamlit run dashboard/app.py`)** is running and press `CTRL+C`.

## 8. Troubleshooting

*   **Port Conflicts:** If port `5000` (for Flask) or `8501` (for Streamlit) is already in use by another application, the respective server will fail to start.
    *   For Flask, you might need to modify `dashboard/flask_app.py` to run on a different port or see if it accepts a `--port` argument.
    *   For Streamlit, you can specify a different port using the `--server.port` option:
        ```bash
        streamlit run dashboard/app.py --server.port 8502
        ```
*   **`.env` Not Loaded:** Ensure your `.env` file is in the project root and correctly populated. The Flask API relies on these settings to connect to services and configure itself.
*   **API Connection Issues:** If the Streamlit UI shows errors about not being able to connect to the API:
    *   Verify the Flask API is running and accessible at the expected URL (default `http://127.0.0.1:5000`).
    *   Check for any CORS (Cross-Origin Resource Sharing) issues if Flask and Streamlit are running on different domains/ports and CORS is not configured correctly in Flask (though for `localhost` development, this is usually not an issue).
*   **Authentication Errors:** Double-check your credentials in `DASHBOARD_CREDENTIALS_FILE` if login fails. Ensure the file path is correctly set in `.env`.
*   **GCP Errors:** If the dashboard shows errors related to GCP or Vertex AI:
    *   Verify your `GOOGLE_APPLICATION_CREDENTIALS` path is correct and the service account has the necessary permissions.
    *   Ensure the `GOOGLE_CLOUD_PROJECT`, `VECTOR_SEARCH_ENDPOINT_ID`, and `DEPLOYED_INDEX_ID` are correctly set in `.env`.

For more detailed troubleshooting, check the terminal output from both the Flask API and Streamlit UI processes, as well as logs generated by VANA (see `tools/logging/` and configured log paths).
