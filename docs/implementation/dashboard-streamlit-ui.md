# Dashboard Streamlit UI Implementation

[Home](../../index.md) > [Implementation](../index.md) > Dashboard Streamlit UI

This document details the implementation of the Streamlit frontend UI (`dashboard/app.py` and related files) for the VANA Monitoring Dashboard. This UI provides a web-based interface for users to visualize monitoring data, health statuses, and alerts, primarily by consuming data from the Flask API backend.

## 1. Overview

The Streamlit UI is designed to be an intuitive and interactive way to monitor VANA's systems, especially the Vector Search integration. It leverages Streamlit's capabilities for rapid UI development and data visualization.

**Key Features:**
*   Multi-page navigation for different monitoring aspects.
*   Display of real-time and historical health data.
*   Visualization of metrics using charts and tables.
*   User-friendly interface for non-technical users to understand system status.

## 2. Project Structure (Relevant to Streamlit UI)

```
dashboard/
├── app.py              # Main Streamlit application entry point (often a router or landing page)
├── frontend/
│   ├── __init__.py
│   ├── pages/          # Directory for individual Streamlit pages/views
│   │   ├── __init__.py
│   │   ├── 01_overview_page.py  # Example page (prefix for ordering)
│   │   └── 02_vector_search_health_page.py # Example page
│   ├── utils/          # Utility functions for the frontend
│   │   ├── __init__.py
│   │   └── api_client.py   # Helper functions to call the Flask API
│   │   └── auth_utils.py   # Helper functions for handling frontend auth state
│   └── components/     # Reusable Streamlit components (if any)
│       └── __init__.py
└── # other dashboard directories (api, auth, monitoring, etc.)

.streamlit/
└── config.toml         # Streamlit configuration file (theming, global settings)
```

## 3. Main Application (`dashboard/app.py`)

The `dashboard/app.py` script is the main entry point when running `streamlit run dashboard/app.py`.
*   **Multi-Page Setup:** Streamlit handles multi-page apps by convention: Python files placed in a `pages/` subdirectory (relative to the main `app.py`) automatically become navigable pages. The main `app.py` can serve as a landing page or a simple router.
*   **Global Configuration:** May set global page configurations using `st.set_page_config()` if not done in individual pages (e.g., site title, favicon, layout).
*   **Authentication Check (High-Level):** Might perform an initial check for authentication status (e.g., if a token is stored in `st.session_state`) and redirect to a login page or show a login form if not authenticated and `DASHBOARD_AUTH_ENABLED` is true.

```python
# Example: dashboard/app.py (Simplified Landing Page)
import streamlit as st

st.set_page_config(
    page_title="VANA Monitoring Dashboard",
    page_icon="📊",
    layout="wide"
)

def main():
    st.title("Welcome to the VANA Monitoring Dashboard")
    st.sidebar.success("Select a view above.")

    st.markdown(
        """
        This dashboard provides insights into the health and performance of VANA's systems.
        Navigate using the sidebar to explore different monitoring views.
        """
    )
    # Authentication logic might be here or handled by each page / a utility
    # For example, checking st.session_state.get("authenticated_user")

if __name__ == "__main__":
    main()
```

## 4. Individual Pages (e.g., `dashboard/frontend/pages/`)

Each `.py` file in the `pages/` directory typically represents a distinct view or section of the dashboard.

*   **Structure of a Page File (e.g., `02_vector_search_health_page.py`):**
    ```python
    import streamlit as st
    import pandas as pd
    import plotly.express as px
    # Assuming api_client.py has functions to call Flask API
    from dashboard.frontend.utils.api_client import fetch_vector_search_health, fetch_vs_latency_metrics
    # Assuming auth_utils.py handles login checks and token management for API calls
    # from dashboard.frontend.utils.auth_utils import ensure_authenticated, get_auth_headers

    # Page specific configuration
    st.set_page_config(page_title="Vector Search Health", layout="wide")

    # if not ensure_authenticated(): # Redirect or stop if not logged in
    #    st.stop()

    st.title("🩺 Vector Search Health Monitoring")

    # Fetch data from Flask API
    health_data = fetch_vector_search_health() # Pass get_auth_headers() if needed
    latency_data = fetch_vs_latency_metrics()

    if health_data:
        st.subheader("Current Health Status")
        # Display overall status, e.g., using st.metric or st.status
        overall_status = health_data.get("overall_status", "UNKNOWN")
        if overall_status == "HEALTHY":
            st.success(f"Overall Status: {overall_status}")
        elif overall_status == "UNHEALTHY":
            st.error(f"Overall Status: {overall_status}")
        else:
            st.warning(f"Overall Status: {overall_status}")

        # Display detailed checks
        # st.dataframe(pd.DataFrame(health_data.get("checks", [])))
    else:
        st.error("Could not retrieve Vector Search health data.")

    if latency_data:
        st.subheader("Latency Metrics")
        col1, col2 = st.columns(2)
        col1.metric("Average Latency (ms)", latency_data.get("average_ms", "N/A"))
        col2.metric("P95 Latency (ms)", latency_data.get("p95_ms", "N/A"))

        # Example: Plot historical latency if available in latency_data
        # if "history" in latency_data:
        #     df_latency = pd.DataFrame(latency_data["history"])
        #     fig = px.line(df_latency, x="timestamp", y="latency_ms", title="Latency Over Time")
        #     st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning("Could not retrieve latency metrics.")

    # Add more UI elements, charts, tables as needed
    ```
*   **Data Fetching:** Pages call functions (e.g., from `dashboard/frontend/utils/api_client.py`) that use the `requests` library to query the Flask API backend.
*   **UI Elements:** Utilize various Streamlit components:
    *   `st.title()`, `st.header()`, `st.subheader()`, `st.markdown()` for text.
    *   `st.metric()` for displaying key performance indicators.
    *   `st.dataframe()`, `st.table()` for tabular data.
    *   `st.line_chart()`, `st.bar_chart()`, `st.plotly_chart()` for visualizations.
    *   `st.columns()`, `st.tabs()`, `st.expander()` for layout.
    *   `st.button()`, `st.selectbox()`, `st.slider()` for interactivity.
*   **Error Handling:** Gracefully handle cases where API calls fail or return no data (e.g., display `st.error()` or `st.warning()`).
*   **Caching:** Use Streamlit's caching decorators (`@st.cache_data` for data, `@st.cache_resource` for resources like ML models or DB connections) on data fetching functions to improve performance and avoid redundant API calls.
    ```python
    # In dashboard/frontend/utils/api_client.py
    # @st.cache_data(ttl=60) # Cache for 60 seconds
    # def fetch_vector_search_health(auth_headers):
    #     # ... API call logic ...
    ```

## 5. API Client Utilities (`dashboard/frontend/utils/api_client.py`)

This module centralizes the logic for making API calls to the Flask backend.
*   **Functions per Endpoint:** Define functions that correspond to specific API endpoints.
*   **Error Handling:** Implement robust error handling for `requests` calls (network errors, HTTP error statuses).
*   **Authentication Headers:** These functions should accept and include authentication tokens (e.g., JWT Bearer token) in request headers if the API endpoints are protected. The token would be retrieved from `st.session_state`.

```python
# Example: dashboard/frontend/utils/api_client.py
import streamlit as st
import requests

FLASK_API_BASE_URL = "http://localhost:5000/api" # Should be configurable

# @st.cache_data(ttl=300) # Cache for 5 minutes
def fetch_data_from_api(endpoint: str, headers: dict = None):
    try:
        response = requests.get(f"{FLASK_API_BASE_URL}/{endpoint}", headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"API Error ({endpoint}): {e}")
        return None

def fetch_vector_search_health(auth_headers: dict = None):
    return fetch_data_from_api("vs/health", headers=auth_headers)

# Add more functions for other endpoints
```

## 6. Authentication Handling on Frontend (`dashboard/frontend/utils/auth_utils.py`)

If dashboard authentication is enabled:
*   **Login Form:** A mechanism to display a login form (`st.text_input` for username/password, `st.button` to submit). This could be on the main `app.py` or a dedicated login page.
*   **Token Storage:** Upon successful login (API call to Flask's `/api/auth/login`), the received authentication token (e.g., JWT) is stored in `st.session_state`.
*   **Token Usage:** The stored token is retrieved from `st.session_state` and passed to `api_client.py` functions to be included in request headers.
*   **Logout:** A button or mechanism to clear the token from `st.session_state`.
*   **Route Protection (Conceptual):** Individual pages might check `st.session_state` for a valid token at the beginning and use `st.stop()` or redirect if not authenticated.

## 7. Streamlit Configuration (`.streamlit/config.toml`)

This file can be used to set global Streamlit options:
*   **Theming:**
    ```toml
    [theme]
    primaryColor="#FF4B4B"
    backgroundColor="#FFFFFF"
    secondaryBackgroundColor="#F0F2F6"
    textColor="#262730"
    font="sans serif"
    ```
*   **Server Options:**
    ```toml
    [server]
    headless = true # Useful for running in containers
    port = 8501
    ```
*   **Browser Options:**
    ```toml
    [browser]
    gatherUsageStats = false
    ```

## 8. Running the UI

As described in the [Running the Dashboard Guide](running-dashboard.md):
1.  Ensure the Flask API backend is running.
2.  Run `streamlit run dashboard/app.py` from the project root.

The Streamlit UI provides a flexible and rapidly developable frontend for the VANA Monitoring Dashboard, making complex monitoring data accessible and understandable.
