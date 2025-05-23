# Dashboard Flask API Endpoints

[Home](../../index.md) > [API Reference](index.md) > Dashboard Flask API Endpoints

This document provides a reference for the RESTful API endpoints exposed by the VANA Monitoring Dashboard's Flask backend (`dashboard/flask_app.py`). These endpoints are primarily consumed by the Streamlit frontend UI but can be used by other clients as well.

## 1. Authentication

Most API endpoints are protected and require authentication. The authentication mechanism is typically token-based (e.g., JWT).
*   A client first authenticates via a login endpoint (e.g., `/api/auth/login`, if implemented and exposed) to obtain a token.
*   Subsequent requests to protected endpoints must include this token in the `Authorization` header, usually as a Bearer token:
    `Authorization: Bearer <your_token_here>`

If `DASHBOARD_AUTH_ENABLED` is `false` in the environment configuration, authentication might be bypassed for some or all endpoints.

## 2. API Base URL

The Flask API typically runs on `http://localhost:5000`. All endpoint paths below are relative to this base URL.
The API routes might be further prefixed, e.g., `/api/vs` for Vector Search related routes. Check `dashboard/flask_app.py` for blueprint registrations and `url_prefix` values.

## 3. Vector Search Monitoring Endpoints

These endpoints are typically defined in `dashboard/api/vector_search_routes.py` (or a similar file) and registered under a prefix like `/api/vs`.

### 3.1. Get Current Vector Search Health

*   **Endpoint:** `GET /api/vs/health`
*   **Description:** Retrieves the current health status of the Vertex AI Vector Search integration. This endpoint typically invokes the `VectorSearchHealthChecker` to perform live checks or fetches the latest cached/stored report.
*   **Authentication:** Required.
*   **Request Parameters:**
    *   `mode` (optional query parameter, e.g., `basic` or `detailed`): Specifies the comprehensiveness of the health check to be performed if a live check is triggered.
*   **Success Response (200 OK):**
    *   **Content-Type:** `application/json`
    *   **Body:** A JSON object representing the health report. The structure is detailed in the [Vector Search Health Checker Implementation document](../implementation/vector-search-health-checker.md#output-of-perform_checks--generate_report) and includes fields like `overall_status`, `summary_message`, `checks` (list of individual check results), `metrics`, and `recommendations`.
    ```json
    {
      "timestamp": "2023-05-17T12:00:00Z",
      "overall_status": "HEALTHY",
      "summary_message": "Vector Search is operating normally.",
      "checks": [
        {
          "name": "EndpointConnectivity",
          "status": "HEALTHY",
          "message": "Successfully connected.",
          "duration_ms": 50
        }
        // ... other checks
      ],
      "metrics": {
        "average_query_latency_ms": 80
      },
      "recommendations": []
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: If authentication fails or token is missing/invalid.
    *   `500 Internal Server Error`: If an error occurs while performing health checks or fetching data. The JSON body might contain an `error` and `details` field.
    ```json
    {
      "error": "Failed to retrieve Vector Search health",
      "details": "Specific error message from the backend."
    }
    ```

### 3.2. Get Vector Search Metrics (Example)

*   **Endpoint:** `GET /api/vs/metrics/latency` (or similar, e.g., `/api/vs/metrics?type=latency`)
*   **Description:** Retrieves specific performance metrics for Vector Search, such as query latency (average, p95, p99) or uptime. This might fetch historical or aggregated data.
*   **Authentication:** Required.
*   **Request Parameters:**
    *   `period` (optional query parameter, e.g., `1h`, `24h`, `7d`): Time period for which to retrieve metrics.
*   **Success Response (200 OK):**
    *   **Content-Type:** `application/json`
    *   **Body:** A JSON object containing the requested metrics.
    ```json
    {
      "period": "24h",
      "average_latency_ms": 85,
      "p95_latency_ms": 200,
      "p99_latency_ms": 350,
      "uptime_percentage": 99.98
      // Potentially a list of [timestamp, value] pairs for historical data
    }
    ```
*   **Error Responses:** Similar to `/api/vs/health`.

### 3.3. Other Potential Vector Search Endpoints

*   **Historical Health Data:** An endpoint to retrieve a list of past health reports or aggregated status over time.
    *   `GET /api/vs/health/history?limit=10&offset=0`
*   **Trigger On-Demand Check:** An endpoint (e.g., `POST /api/vs/health/run-check`) to explicitly trigger a new health check cycle, though this is often integrated into the GET `/api/vs/health` endpoint.

## 4. Authentication Endpoints (Conceptual)

If token-based authentication is used, there would typically be an endpoint for login. This might be defined in `dashboard/auth/auth.py` or a dedicated auth blueprint.

*   **Endpoint:** `POST /api/auth/login`
*   **Description:** Authenticates a user and returns an access token.
*   **Authentication:** Not required for this specific endpoint.
*   **Request Body:**
    *   **Content-Type:** `application/json`
    ```json
    {
      "username": "your_username",
      "password": "your_password"
    }
    ```
*   **Success Response (200 OK):**
    *   **Content-Type:** `application/json`
    *   **Body:**
    ```json
    {
      "message": "Login successful",
      "token": "your_jwt_or_session_token_here",
      "expires_in": 3600 // Optional: token expiry in seconds
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If username/password are missing.
    *   `401 Unauthorized`: If credentials are invalid.

## 5. General API Conventions

*   **JSON Responses:** All data responses are in JSON format.
*   **Error Handling:** Errors typically return a JSON object with an `error` field and optionally a `details` field. Standard HTTP status codes are used.
*   **HTTP Methods:** `GET` for retrieving data, `POST` for creating or triggering actions, `PUT` for updating, `DELETE` for removing (though the monitoring API is mostly read-only).

This document provides a general guide. The exact endpoints, their parameters, and response structures should always be verified by inspecting the Flask API source code, particularly the route definitions in `dashboard/api/` and related modules.
