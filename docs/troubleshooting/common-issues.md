# Common Issues in VANA

[Home](../index.md) > [Troubleshooting](index.md) > Common Issues

This guide provides solutions for common issues that may arise when setting up, configuring, or running the VANA system. For issues specific to a particular component, also refer to its dedicated troubleshooting guide or documentation.

## 1. Configuration and Environment Variable Issues

### Symptoms:
-   Components fail to initialize (e.g., `VectorSearchClient`, `KnowledgeGraphManager`, `WebSearchClient`).
-   Errors related to missing API keys, project IDs, or endpoint information.
-   Authentication failures with external services (GCP, MCP Server).
-   Application using unexpected default settings.

### Possible Causes:
1.  `.env` file is missing, not in the project root, or not correctly named (`.env`).
2.  Required environment variables are not defined in the `.env` file or system environment.
3.  Incorrect values for environment variables (e.g., typos in API keys, wrong project ID).
4.  Path to GCP service account key (`GOOGLE_APPLICATION_CREDENTIALS`) is incorrect or the file is not accessible.
5.  `config/environment.py` is not loading variables as expected (e.g., issues with `python-dotenv` or path resolution).

### Solutions:
1.  **Verify `.env` File:**
    *   Ensure a `.env` file exists in the VANA project root directory.
    *   Compare your `.env` file with `.env.example` to make sure all necessary variables are present.
    *   Double-check the spelling of variable names and their values.
2.  **Check Critical Paths:**
    *   For `GOOGLE_APPLICATION_CREDENTIALS`, ensure it's an **absolute path** to your valid GCP service account JSON key file, and that the file is readable by the VANA process.
3.  **Inspect Loaded Configuration (Debugging):**
    *   Temporarily add print statements in `config/environment.py` or at the start of a script/tool to display the values of loaded environment variables to confirm they are what you expect.
    *   Example: `print(f"GCP Project ID: {environment.GCP_PROJECT_ID}")`
4.  **Refer to Guides:** Consult the [Installation Guide](../guides/installation-guide.md#5-configuring-environment-variables) and specific tool configuration guides (e.g., [Web Search Configuration](../guides/web-search-configuration.md)).

## 2. Python Dependency and Virtual Environment Issues

### Symptoms:
-   `ModuleNotFoundError` when trying to run a script or import a VANA tool.
-   Errors indicating a missing Python package (e.g., `No module named 'google.cloud.aiplatform'`).
-   Unexpected behavior due to incorrect package versions.

### Possible Causes:
1.  Python virtual environment (`.venv/`) not created or not activated.
2.  Dependencies not installed correctly or completely.
3.  Using the system Python interpreter instead of the virtual environment's interpreter.
4.  Conflicts between package versions.

### Solutions:
1.  **Activate Virtual Environment:** Always ensure your virtual environment is activated before running any VANA scripts or commands:
    ```bash
    source .venv/bin/activate  # macOS/Linux
    # .venv\Scripts\activate  # Windows
    ```
    Your terminal prompt should indicate the active environment (e.g., `(.venv)`).
2.  **Install/Reinstall Dependencies:**
    *   Ensure `dashboard/requirements.txt` (and any other relevant `requirements.txt` files) are up-to-date.
    *   Run `pip install -r dashboard/requirements.txt` (or other relevant requirements file).
    *   Consider upgrading pip: `pip install --upgrade pip`.
3.  **Check Python Interpreter:**
    *   Verify which Python interpreter is being used: `which python` (macOS/Linux) or `where python` (Windows). It should point to the interpreter inside your `.venv` directory.
4.  **Resolve Conflicts:** If version conflicts occur, you might need to adjust versions in `requirements.txt` or create a fresh virtual environment.

## 3. GCP Service Account Permission Issues

### Symptoms:
-   Errors from `VectorSearchClient` or other GCP-interacting tools like "PermissionDenied", "403 Forbidden", or messages indicating insufficient permissions for a specific GCP API (e.g., `aiplatform.indexEndpoints.get` denied).
-   Failure to generate embeddings, query Vector Search, or access GCS buckets.

### Possible Causes:
1.  The GCP service account specified by `GOOGLE_APPLICATION_CREDENTIALS` does not have the required IAM roles/permissions for the GCP services VANA uses (Vertex AI, Document AI, GCS, etc.).
2.  The wrong service account key is being used.
3.  The necessary GCP APIs (e.g., Vertex AI API, Document AI API) are not enabled for the GCP project.

### Solutions:
1.  **Verify IAM Roles:**
    *   In the Google Cloud Console, go to "IAM & Admin" > "IAM".
    *   Find the service account VANA is using.
    *   Ensure it has appropriate roles. Common roles needed might include:
        *   "Vertex AI User" (for most Vertex AI operations).
        *   "Storage Object Admin" or "Storage Object Viewer" (if VANA reads/writes to GCS).
        *   "Document AI User" or "Document AI Editor" (for Document AI).
        *   Specific permissions might be listed in error messages.
2.  **Check Service Account Key:** Ensure the JSON key file pointed to by `GOOGLE_APPLICATION_CREDENTIALS` is correct and corresponds to the service account with the right permissions.
3.  **Enable APIs:** In Google Cloud Console, go to "APIs & Services" > "Library" and ensure "Vertex AI API", "Document AI API", etc., are enabled for your project.
4.  **Test Authentication (gcloud CLI):**
    ```bash
    gcloud auth activate-service-account --key-file=/path/to/your/keyfile.json
    gcloud auth list # Verify the service account is active
    # Try a gcloud command that requires similar permissions, e.g.:
    # gcloud ai index-endpoints list --project=your-gcp-project-id --region=your-region
    ```

## 4. External Service Connectivity Issues (MCP Server, Google APIs)

### Symptoms:
-   Errors related to timeouts, connection refused, or DNS resolution when tools like `KnowledgeGraphManager` or `WebSearchClient` try to make API calls.
-   Circuit breaker open exceptions.

### Possible Causes:
1.  Network connectivity problems from the machine running VANA to the internet or the specific service endpoint.
2.  Firewall blocking outgoing connections.
3.  The external service itself is down or experiencing issues.
4.  Incorrect endpoint URL configured in `.env` (e.g., for `MCP_ENDPOINT`).
5.  Proxy server issues (if applicable in your network environment).

### Solutions:
1.  **Check Basic Network Connectivity:**
    *   Use `ping` or `curl` to test connectivity to the general internet and, if possible, the host of the service (e.g., `ping mcp.community.augment.co`).
    *   `curl -I https://mcp.community.augment.co` (or other relevant endpoint).
2.  **Verify Endpoint URLs:** Double-check `MCP_ENDPOINT` and other service URLs in your `.env` file.
3.  **Check Service Status Pages:** Look for official status pages for Google Cloud services or the MCP community server if issues are suspected.
4.  **Circuit Breaker Status:** If VANA uses circuit breakers, check logs for messages about breakers being open. The [Monitoring Dashboard](../guides/dashboard-guide.md) might also show this.
5.  **Firewall/Proxy:** If in a corporate network, check for local firewall or proxy configurations that might be interfering.

## 5. Component Interaction Failures (e.g., Dashboard UI can't reach Flask API)

### Symptoms:
-   VANA Monitoring Dashboard UI shows errors like "Cannot connect to API" or fails to load data.
-   One VANA tool fails when trying to use another VANA tool.

### Possible Causes:
1.  The required backend component (e.g., Flask API for the Streamlit UI) is not running.
2.  Components are running on different hosts/ports than expected by the calling component.
3.  CORS (Cross-Origin Resource Sharing) issues if frontend and backend are on different origins (less common for localhost development but possible).

### Solutions:
1.  **Ensure All Components are Running:** For the dashboard, verify both `dashboard/flask_app.py` and `streamlit run dashboard/app.py` are running in separate terminals.
2.  **Check Ports and Hosts:** Confirm the Flask API is running on the port Streamlit expects to call (usually `localhost:5000`).
3.  **Inspect Browser Developer Console:** For UI issues, open your browser's developer console (usually F12) and check the "Console" and "Network" tabs for errors (e.g., failed API requests, JavaScript errors, CORS errors).
4.  **Review Logs:** Check logs for both the calling component and the component being called for error messages.

For more specific troubleshooting, refer to the documentation for the individual VANA component or tool you are having trouble with.
