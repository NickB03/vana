# Dashboard Flask API Implementation

[Home](../../index.md) > [Implementation](../index.md) > Dashboard Flask API

This document details the implementation of the Flask API backend (`dashboard/flask_app.py`) for the VANA Monitoring Dashboard. This API serves as the data provider for the Streamlit frontend UI and handles backend logic related to monitoring and authentication.

## 1. Overview

The Flask API is a crucial component of the VANA Monitoring Dashboard. It provides RESTful endpoints that the Streamlit UI (or other clients) can call to fetch monitoring data, health statuses, and potentially trigger actions.

**Key Responsibilities:**
*   Exposing data related to Vector Search health and performance.
*   User authentication for accessing the dashboard.
*   Interfacing with core VANA tools like `VectorSearchHealthChecker`.
*   Logging API requests and errors.

## 2. Project Structure (Relevant to API)

```
dashboard/
├── flask_app.py        # Main Flask application entry point
├── api/                # Directory for API Blueprints
│   ├── __init__.py
│   ├── vector_search_routes.py  # Routes related to Vector Search monitoring
│   └── # (other blueprint files for future extensions)
├── auth/               # Authentication related logic
│   ├── __init__.py
│   ├── auth.py             # Authentication mechanisms (e.g., token handling, password hashing)
│   └── credentials.json.example # Example structure for user credentials
├── monitoring/         # Logic for fetching and processing monitoring data
│   ├── __init__.py
│   └── # (e.g., modules interacting with HealthChecker)
└── # other dashboard directories (frontend, templates, etc.)

config/
└── environment.py      # For loading .env configurations

tools/
└── vector_search/
    └── health_checker.py # Used by the API to get health data
```

## 3. Core Flask Application (`dashboard/flask_app.py`)

*   **Initialization:**
    *   Creates the Flask `app` instance.
    *   Loads configuration from `config.environment` (which in turn loads from `.env`). Key configurations include `DASHBOARD_SECRET_KEY`, `DASHBOARD_AUTH_ENABLED`, `DASHBOARD_CREDENTIALS_FILE`.
    *   Configures CORS (Cross-Origin Resource Sharing) if necessary, especially if the Streamlit UI is served from a different origin/port than the Flask API in some deployment scenarios (though typically `localhost` development doesn't strictly need it if ports are different).
*   **Blueprints:**
    *   Registers API Blueprints from the `dashboard/api/` directory. Blueprints help organize routes into logical groups.
        ```python
        from flask import Flask
        from config import environment
        from dashboard.api.vector_search_routes import vector_search_bp
        # from dashboard.api.another_module_routes import another_module_bp # Example

        app = Flask(__name__)
        app.config['SECRET_KEY'] = environment.DASHBOARD_SECRET_KEY
        # ... other app configurations ...

        # Register Blueprints
        app.register_blueprint(vector_search_bp, url_prefix='/api/vs') # Example prefix
        # app.register_blueprint(another_module_bp, url_prefix='/api/another')

        if __name__ == '__main__':
            app.run(host='0.0.0.0', port=environment.FLASK_PORT, debug=environment.FLASK_DEBUG)
        ```
*   **Error Handling:** May define global error handlers (e.g., for 404 Not Found, 500 Internal Server Error) to return JSON responses.
*   **Logging:** Integrates with VANA's standard logging (`tools/logging/`) to log requests, errors, and important application events.

## 4. API Blueprints (e.g., `dashboard/api/vector_search_routes.py`)

Blueprints define a collection of routes for a specific feature area.

*   **Example: Vector Search Routes (`vector_search_routes.py`)**
    ```python
    from flask import Blueprint, jsonify, request
    from dashboard.auth.auth import token_required # Assuming token-based auth
    from tools.vector_search.health_checker import VectorSearchHealthChecker # Example
    # from dashboard.monitoring.vector_search_monitor import get_vs_summary # Example data fetcher

    vector_search_bp = Blueprint('vector_search_api', __name__)
    health_checker = VectorSearchHealthChecker() # Initialize once or use a factory

    @vector_search_bp.route('/health', methods=['GET'])
    @token_required
    def get_vector_search_health():
        try:
            # health_status = get_vs_summary() # Fetch pre-calculated summary
            # Or, trigger a live check (might be slow for an API response)
            health_report = health_checker.perform_checks(mode="basic") # Or a specific mode
            return jsonify(health_report), 200
        except Exception as e:
            # Log the exception
            return jsonify({"error": "Failed to retrieve Vector Search health", "details": str(e)}), 500

    @vector_search_bp.route('/metrics/latency', methods=['GET'])
    @token_required
    def get_vector_search_latency_metrics():
        # Logic to fetch latency data (e.g., from a time-series store or logs)
        # For example:
        # latency_data = fetch_latency_timeseries_from_source()
        latency_data = {"average_ms": 50, "p95_ms": 150} # Placeholder
        return jsonify(latency_data), 200

    # Other routes for historical data, specific checks, etc.
    ```
*   **Route Definitions:** Use decorators like `@blueprint_name.route('/path', methods=['GET', 'POST'])`.
*   **Request Handling:** Access request data via Flask's `request` object (e.g., `request.args` for query parameters, `request.json` for JSON body).
*   **Response Formatting:** Use `jsonify()` to return JSON responses. Include appropriate HTTP status codes.
*   **Authentication:** Protect routes using decorators like `@token_required` (defined in `dashboard/auth/auth.py`).

## 5. Authentication (`dashboard/auth/auth.py`)

This module handles user authentication.

*   **Credential Storage:**
    *   User credentials (username, hashed password) are typically loaded from a JSON file specified by `DASHBOARD_CREDENTIALS_FILE`.
    *   Passwords should always be stored hashed (e.g., using Werkzeug's security helpers or passlib).
*   **Login Endpoint (Conceptual - might be part of a general auth Blueprint):**
    *   A `/api/auth/login` endpoint that accepts username/password.
    *   Validates credentials against the stored (hashed) passwords.
    *   If valid, generates a JWT (JSON Web Token) or a session token.
*   **Token Verification (`@token_required` decorator):**
    *   A decorator function that can be applied to Flask routes.
    *   Checks for a valid token in the request headers (e.g., `Authorization: Bearer <token>`).
    *   If the token is missing or invalid, it returns a 401 Unauthorized or 403 Forbidden response.
    *   If valid, it might inject user information into Flask's `g` object or the request context.
*   **Password Hashing Utilities:** Functions for generating password hashes and checking passwords against hashes.

```python
# Simplified example of a token_required decorator
from functools import wraps
from flask import request, jsonify #, g (for passing user info)
# import jwt # If using JWT

# def token_required(f):
#     @wraps(f)
#     def decorated(*args, **kwargs):
#         token = None
#         if 'Authorization' in request.headers:
#             auth_header = request.headers['Authorization']
#             try:
#                 token = auth_header.split(" ")[1]
#             except IndexError:
#                 return jsonify({"message": "Bearer token malformed."}), 401
#
#         if not token:
#             return jsonify({"message": "Token is missing!"}), 401
#
#         try:
#             # data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
#             # current_user = get_user_by_id(data['user_id']) # Fetch user from DB/credentials file
#             # g.current_user = current_user
#             # This is a placeholder for actual token validation logic
#             if token == "VALID_TOKEN_PLACEHOLDER": # Replace with real validation
#                 pass # Token is valid
#             else:
#                 raise Exception("Invalid token")
#         except Exception as e:
#             return jsonify({"message": "Token is invalid or expired!", "error": str(e)}), 401
#
#         return f(*args, **kwargs)
#     return decorated
```
*The actual implementation in `dashboard/auth/auth.py` should be consulted for the precise mechanism.*

## 6. Monitoring Data Logic (`dashboard/monitoring/`)

This directory might contain modules responsible for:
*   Interacting with `VectorSearchHealthChecker` or other VANA tools to get raw health/performance data.
*   Aggregating or summarizing data for API responses.
*   Storing and retrieving historical monitoring data (if the dashboard supports trends). This might involve a simple file-based store or a lightweight database.

## 7. Configuration Usage

*   The API relies heavily on `config.environment` for:
    *   `DASHBOARD_SECRET_KEY` for session/token security.
    *   `DASHBOARD_AUTH_ENABLED` to toggle authentication.
    *   Paths to credential files.
    *   Endpoints and configurations for underlying services it needs to call (though often it calls VANA tools which themselves are configured via `config.environment`).

## 8. Running the API

The API is run using the main `dashboard/flask_app.py` script:
```bash
python dashboard/flask_app.py
```
It typically runs on `http://127.0.0.1:5000` by default.

## 9. Future Enhancements Considerations

*   **More Sophisticated Data Storage:** For historical metrics, a proper time-series database or a more robust data store might be integrated.
*   **Asynchronous Operations:** For long-running data collection tasks initiated via API, consider using Celery or Flask-APScheduler.
*   **API Versioning:** If the API evolves significantly, introduce versioning (e.g., `/api/v1/...`, `/api/v2/...`).
*   **Input Validation:** Implement rigorous input validation for any API endpoints that accept parameters or request bodies (e.g., using Marshmallow or Pydantic).

This implementation structure provides a solid foundation for the VANA Monitoring Dashboard's backend, allowing for organized development and future extensions.
