# Vector Search Health Checker Implementation

[Home](../../index.md) > [Implementation](./index.md) > Vector Search Health Checker

The `VectorSearchHealthChecker` (`tools/vector_search/health_checker.py`) is a key component in VANA for assessing the health and operational status of the Google Cloud Vertex AI Vector Search integration.

## Overview

The primary role of the `VectorSearchHealthChecker` is to perform a series of predefined tests against the configured Vector Search endpoint and index. It utilizes the `VectorSearchClient` to interact with Vertex AI. The results of these checks are compiled into a health report, which can include an overall status, details of individual checks, performance metrics, and potentially actionable recommendations.

This tool is used by:
- The VANA Monitoring Dashboard (via the Flask API) to display health status.
- The `scripts/scheduled_vector_search_monitor.py` for automated, periodic health assessments.
- The `scripts/test_vector_search_health.py` command-line tool for on-demand checks.

Key checks performed may include:
- Verification of environment variable configuration for Vector Search.
- Basic authentication/connectivity tests to the Vertex AI endpoint.
- Test embedding generation (if applicable, or assumes `VectorSearchClient` can do this).
- Test search functionality (e.g., performing a sample query).
- Index status and configuration validation.

## Class Structure (`VectorSearchHealthChecker`)

The `VectorSearchHealthChecker` class is implemented in `tools/vector_search/health_checker.py`.

### Core Methods (Conceptual)

- `__init__(self, vector_search_client: VectorSearchClient = None)`:
    - Initializes the health checker.
    - Optionally accepts an existing `VectorSearchClient` instance. If not provided, it instantiates its own `VectorSearchClient` (which loads configuration from `config.environment`).
    - Loads any specific configurations for health checks (e.g., sample query, latency thresholds) from `config.environment`.
- `perform_checks(self, mode: str = "basic") -> dict`:
    - The main method that executes a suite of health checks.
    - The `mode` parameter (`basic`, `detailed`) can control the depth or number of checks performed.
    - Iterates through various check methods (e.g., `_check_environment_config`, `_check_connectivity`, `_check_sample_query`).
    - Aggregates results from individual checks.
    - Determines an overall health status (`ok`, `warn`, `error`, `critical` - or similar VANA-standard statuses).
    - Returns a structured dictionary representing the health report.
- `generate_report(self, mode: str = "basic") -> dict`: (May be same as `perform_checks` or a wrapper)
    - Performs checks and formats them into a comprehensive report object.
- `save_report_to_file(self, report: dict, filepath: str)`:
    - Saves a generated health report (dictionary) to a JSON file.
- `get_recommendations(self, health_report: dict) -> list`:
    - Analyzes a health report.
    - Generates a list of actionable recommendations based on detected issues or warnings. Each recommendation might include priority, category, title, and suggested action.

### Individual Check Methods (Private/Protected, Conceptual)

These methods are called internally by `perform_checks`:
- `_check_environment_config()`: Verifies essential environment variables for Vector Search are set (e.g., `GOOGLE_CLOUD_PROJECT`, `VECTOR_SEARCH_ENDPOINT_ID`).
- `_check_authentication_and_connectivity()`: Attempts a basic connection or a simple read operation using `VectorSearchClient` to verify authentication and network connectivity to the Vertex AI endpoint.
- `_check_embedding_generation()`: (If applicable) May test the `VectorSearchClient.generate_embeddings()` method with a sample text.
- `_check_sample_search()`: Performs a predefined search query using `VectorSearchClient.find_neighbors()` and evaluates the success and latency of the response.
- `_check_index_status()`: Queries for metadata about the deployed index to check its status (e.g., if it's active, number of embeddings).
- `_check_data_consistency()`: (Advanced) Might perform checks like comparing embedding counts over time if historical data is available.

### Output of `perform_checks` / `generate_report`

The method returns a dictionary, structured similarly to this example:
```json
{
  "timestamp": "2023-05-15T12:34:56.789Z", // ISO 8601 Timestamp
  "overall_status": "WARN", // e.g., HEALTHY, WARN, ERROR, CRITICAL
  "summary_message": "Vector Search is operational but experiencing high latency on sample queries.",
  "checks": [
    {
      "name": "EnvironmentConfiguration",
      "status": "HEALTHY",
      "message": "All required environment variables are set.",
      "details": {"checked_vars": ["GOOGLE_CLOUD_PROJECT", "..."]}
    },
    {
      "name": "EndpointConnectivity",
      "status": "HEALTHY",
      "message": "Successfully connected to Vertex AI endpoint.",
      "duration_ms": 50
    },
    {
      "name": "SampleQuery",
      "status": "WARN",
      "message": "Sample query successful but latency exceeds threshold.",
      "details": {"query_text": "sample", "latency_ms": 1500, "threshold_ms": 1000},
      "duration_ms": 1505
    }
    // ... other checks ...
  ],
  "metrics": { // Aggregated or key performance metrics
    "total_check_duration_ms": 1800,
    "average_query_latency_ms": 1500 // From sample query
  },
  "recommendations": [ // Generated by get_recommendations based on this report
    {
      "priority": "MEDIUM",
      "category": "Performance",
      "title": "High Query Latency",
      "action": "Investigate Vector Search index configuration or current load on Vertex AI."
    }
  ]
}
```

## Command-Line Tool (`scripts/test_vector_search_health.py`)

A command-line script, `scripts/test_vector_search_health.py`, provides a direct way to use the `VectorSearchHealthChecker`.

### Command-Line Options (Conceptual)

- `--mode {basic|detailed}`: Specifies the comprehensiveness of the checks.
- `--verbose`: Increases output verbosity.
- `--report-file FILEPATH`: Saves the JSON health report to the specified file.
- `--output-format {text|json}`: Format for console output.
- Potentially other options to target specific checks or configurations.

### CLI Usage Examples

-   **Basic health check:**
    ```bash
    python scripts/test_vector_search_health.py --mode basic
    ```
-   **Detailed health check with JSON output to a file:**
    ```bash
    python scripts/test_vector_search_health.py --mode detailed --output-format json --report-file vs_health_report.json
    ```

The `scripts/scheduled_vector_search_monitor.py` script also uses `VectorSearchHealthChecker` for its periodic checks, potentially with options like `--interval` and `--count` if it's designed for continuous monitoring runs.

## Interpreting Health Reports and Recommendations

Refer to the [Interpreting Vector Search Health Reports Guide](../guides/vector-search-health-reports.md) for detailed information on understanding the output of the health checker, including the meaning of different statuses and how to act on recommendations.

## Integration with Other VANA Components

*   **Flask API (`dashboard/flask_app.py`):** Instantiates `VectorSearchHealthChecker` and calls its `perform_checks` (or similar) method to get data for dashboard display.
*   **`VectorSearchClient`:** The `VectorSearchHealthChecker` *uses* an instance of `VectorSearchClient` to perform its checks against the actual Vertex AI service. It does not duplicate client logic.
*   **Logging:** The checker uses VANA's standard logging (`tools/logging/logger.py`) to record its activities and detailed findings.

## Error Handling and Resilience

*   The `VectorSearchHealthChecker` should gracefully handle errors from the `VectorSearchClient` (e.g., if Vertex AI is unreachable). In such cases, the relevant checks would be marked as failed, contributing to the overall health status.
*   It should not crash if a single check fails but should attempt to complete all configured checks.

## Testing

The `VectorSearchHealthChecker` can be tested using the fixtures provided in `tests/fixtures/vector_search_fixtures.py`:

### Test Fixtures

*   **`vector_search_health_checker`**: A pytest fixture that creates a `VectorSearchHealthChecker` instance with either a mock or real `VectorSearchClient`.
    ```python
    def test_health_checker(vector_search_health_checker):
        # Run a health check
        result = vector_search_health_checker.check_health()

        # Assert on the result
        assert result['status'] in ['ok', 'warn', 'error', 'critical', 'unknown']
    ```

*   **`mock_vector_search_client`**: A configurable mock client that can be used to test the health checker with simulated success and error conditions.
    ```python
    def test_health_checker_with_failing_client(mock_vector_search_client):
        # Configure the mock client to simulate failures
        mock_vector_search_client.is_available_flag = False
        mock_vector_search_client.embedding_success = False

        # Create a health checker with the mock client
        health_checker = VectorSearchHealthChecker(vector_search_client=mock_vector_search_client)

        # Run a health check
        result = health_checker.check_health()

        # Assert that the health check detects the failures
        assert result['status'] == 'critical'
        assert result['checks']['authentication']['status'] == 'error'
    ```

### Integration Testing

Integration tests for the `VectorSearchHealthChecker` should verify:

1. **Proper Detection of Issues**: The health checker correctly identifies and reports issues with the Vector Search service.
2. **Accurate Status Calculation**: The overall status accurately reflects the severity of detected issues.
3. **Useful Recommendations**: The recommendations generated are relevant to the detected issues.
4. **History Tracking**: The health history is properly maintained and used for trend analysis.

### Performance Testing

Performance tests for the `VectorSearchHealthChecker` should evaluate:

1. **Response Time**: The time taken to complete a health check.
2. **Resource Usage**: Memory and CPU usage during health checks.
3. **Scalability**: Performance with increasing history size or check complexity.

This implementation provides a robust way to monitor the Vector Search integration, forming a critical part of VANA's observability strategy.
