# Extending the VANA Monitoring Dashboard Guide

[Home](../../index.md) > [Guides](../index.md) > Extending the Dashboard

This guide provides an overview of how to extend the VANA Monitoring Dashboard. The dashboard, consisting of a Flask API backend and a Streamlit frontend UI, is designed to be extensible to incorporate new monitoring views, data sources, or functionalities.

## 1. Overview of Dashboard Architecture

Before extending, recall the dashboard's architecture:
*   **Flask API Backend (`dashboard/flask_app.py`):**
    *   Exposes RESTful API endpoints.
    *   Handles business logic for fetching and processing monitoring data.
    *   Manages authentication.
    *   Organized using Flask Blueprints for different routes (e.g., `dashboard/api/vector_search_routes.py`).
*   **Streamlit Frontend UI (`dashboard/app.py`):**
    *   A multi-page Streamlit application.
    *   Pages are typically separate Python files in a directory like `dashboard/frontend/pages/`.
    *   Consumes data solely from the Flask API.
    *   Uses Streamlit components for UI elements (charts, tables, forms).

## 2. Common Extension Scenarios

*   **Adding a New Monitoring View/Page:** Displaying information about a new component or a new aspect of an existing component.
*   **Integrating a New Data Source:** Fetching and displaying data from a newly monitored VANA tool or external service.
*   **Adding New API Endpoints:** Exposing new data or control functions via the Flask API.
*   **Enhancing Existing Views:** Adding more details, new visualizations, or interactive elements to current dashboard pages.

## 3. Steps to Extend the Dashboard

### 3.1. Extending the Flask API Backend (If new data is needed)

If your extension requires new data not currently exposed by the API:

1.  **Define the New Data Requirement:**
    *   What data needs to be exposed?
    *   What should be the structure of the API response (JSON)?
    *   What parameters (if any) will the API endpoint take?

2.  **Create/Update Data Fetching Logic:**
    *   Implement or modify Python functions/classes (potentially in `dashboard/monitoring/` or a new module) to collect and process the new data. This logic might interact with VANA tools (e.g., a new health checker) or external services.

3.  **Create a New Flask Blueprint (Optional but Recommended for new sections):**
    *   If adding a new major section, create a new Blueprint file (e.g., `dashboard/api/new_component_routes.py`).
    *   Define your new API routes within this Blueprint.
        ```python
        # dashboard/api/new_component_routes.py
        from flask import Blueprint, jsonify, request
        # from dashboard.auth.auth import token_required # If auth is needed
        # from dashboard.monitoring import new_data_fetcher # Your new logic

        new_component_bp = Blueprint('new_component_api', __name__)

        @new_component_bp.route('/api/new_component/status', methods=['GET'])
        # @token_required # Uncomment if endpoint needs authentication
        def get_new_component_status():
            # status_data = new_data_fetcher.get_status()
            status_data = {"status": "healthy", "metric": 123} # Placeholder
            return jsonify(status_data)
        ```

4.  **Register the Blueprint in `dashboard/flask_app.py`:**
    ```python
    # In dashboard/flask_app.py
    # from dashboard.api.new_component_routes import new_component_bp
    # app.register_blueprint(new_component_bp)
    ```

5.  **Add Authentication (if needed):**
    *   Protect your new endpoint using the `@token_required` decorator (or similar auth mechanism used in the project) if the data is sensitive.

6.  **Error Handling and Logging:**
    *   Implement robust error handling for your new API endpoints.
    *   Add logging using VANA's standard logger.

7.  **Testing:**
    *   Test your new API endpoint using tools like `curl`, Postman, or by writing Python test scripts that use the `requests` library.

### 3.2. Extending the Streamlit Frontend UI

Once the necessary data is available via the Flask API (or if you are just modifying an existing UI page):

1.  **Create a New Page (If adding a new view):**
    *   Add a new Python file in the directory used for Streamlit pages (e.g., `dashboard/frontend/pages/03_new_component_view.py`). The numerical prefix often dictates the order in Streamlit's sidebar.
    *   The file should contain Streamlit code to build the page.
        ```python
        # dashboard/frontend/pages/03_new_component_view.py
        import streamlit as st
        import requests # To call the Flask API
        import pandas as pd # For data manipulation/display
        import plotly.express as px # For charts

        # Function to fetch data from your new Flask API endpoint
        def fetch_new_component_data():
            api_url = "http://localhost:5000/api/new_component/status" # Adjust if needed
            # Add auth headers if required by the API endpoint
            # headers = {"Authorization": f"Bearer {st.session_state.get('auth_token')}"}
            try:
                response = requests.get(api_url) #, headers=headers)
                response.raise_for_status() # Raise an exception for HTTP errors
                return response.json()
            except requests.exceptions.RequestException as e:
                st.error(f"Error fetching data from API: {e}")
                return None

        st.set_page_config(page_title="New Component Monitoring", layout="wide")
        st.title("📊 New Component Monitoring")

        data = fetch_new_component_data()

        if data:
            st.metric(label="Status", value=data.get("status", "N/A").upper())
            st.metric(label="Key Metric", value=data.get("metric", 0))
            
            # Example: Display raw data
            st.subheader("Raw Data")
            st.json(data)
            
            # Example: Create a chart if data is suitable
            # if 'historical_data' in data:
            #     df = pd.DataFrame(data['historical_data'])
            #     fig = px.line(df, x='timestamp', y='value', title='Metric Over Time')
            #     st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("Could not load data for the new component.")

        # Add more Streamlit components as needed
        ```

2.  **Modify an Existing Page:**
    *   Locate the Python file for the existing page (e.g., in `dashboard/frontend/pages/`).
    *   Add new sections, charts, or data displays using Streamlit components.
    *   If new data is needed, update or add functions to fetch it from the (potentially extended) Flask API.

3.  **API Interaction:**
    *   Use the `requests` library to make calls to your Flask API endpoints from the Streamlit page code.
    *   Handle API authentication if your endpoints are protected (e.g., pass JWT tokens stored in `st.session_state`).
    *   Implement error handling for API calls (e.g., display user-friendly messages if the API is down or returns an error).

4.  **Data Visualization:**
    *   Use Streamlit's native charting elements (`st.line_chart`, `st.bar_chart`) or integrate with libraries like Plotly (`st.plotly_chart`), Altair (`st.altair_chart`), Matplotlib (`st.pyplot`) for more complex visualizations.
    *   Use Pandas DataFrames for data manipulation before plotting.

5.  **UI Elements:**
    *   Utilize Streamlit's wide range of input widgets (`st.selectbox`, `st.slider`, `st.text_input`) for interactivity, and display elements (`st.metric`, `st.table`, `st.markdown`) for presenting information.

6.  **State Management:**
    *   Use `st.session_state` to store state across reruns or user interactions within a session (e.g., authentication tokens, selected filters).

7.  **Testing:**
    *   Run the Flask API and then the Streamlit app locally (`streamlit run dashboard/app.py`) to test your new page or changes.
    *   Verify data is fetched and displayed correctly.
    *   Check responsiveness and error handling.

## 4. Styling and Theming

*   Streamlit has basic theming capabilities (light/dark mode, primary color) configurable in `.streamlit/config.toml`.
*   For more advanced styling, you can use `st.markdown` with HTML/CSS (use `unsafe_allow_html=True` cautiously) or explore Streamlit Components for custom styling.

## 5. Documentation

*   **Flask API:** If you added new API endpoints, document them (e.g., in `docs/api/flask-api-endpoints.md`). Include request/response formats, parameters, and authentication requirements.
*   **Streamlit UI:** Update relevant user guides (e.g., `docs/guides/dashboard-guide.md`) to explain any new views or functionalities you've added to the dashboard.
*   **Code Comments & Docstrings:** Add clear comments and docstrings to your new Flask and Streamlit code.

## 6. Best Practices

*   **Modularity:** Keep Flask Blueprints focused. Keep Streamlit pages for different views in separate files.
*   **Separation of Concerns:** The Streamlit UI should focus on presentation. Business logic and data fetching should reside in the Flask API or backend modules it calls.
*   **Performance:**
    *   Optimize API calls from Streamlit. Use caching (`@st.cache_data`, `@st.cache_resource`) appropriately for functions that fetch or compute data, especially if it's expensive or doesn't change frequently.
    *   Ensure Flask API endpoints are performant.
*   **User Experience:** Design new dashboard views to be intuitive and informative.
*   **Security:** If adding new API endpoints, ensure they are appropriately protected if they expose sensitive data or functionality.

By following these guidelines, you can effectively extend the VANA Monitoring Dashboard to meet new monitoring needs as the project evolves.
