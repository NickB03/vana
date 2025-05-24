# VANA Development Guide

[Home](../../index.md) > Development

This section provides documentation relevant to developers working on or extending the VANA project. It covers development workflows, coding standards, testing strategies, and guides for customizing or extending specific VANA components.

## Key Development Topics

*   **[Contributing Guidelines](../../CONTRIBUTING.md):** (Located in the root directory)
    *   This is the primary document for understanding VANA's development process. It covers:
        *   Coding standards and style guides.
        *   Testing requirements and procedures.
        *   Branching strategy (e.g., feature branches, develop branch).
        *   Pull Request (PR) process.
        *   Commit message guidelines.
        *   Documentation update requirements alongside code changes.
    *   **All developers should read and adhere to `CONTRIBUTING.md`.**

*   **[Environment Setup for Development](../guides/installation-guide.md):**
    *   Details on setting up your local development environment, including Python virtual environments, installing dependencies, and configuring `.env` files.

*   **[Adding a New Tool to VANA](../guides/adding-new-tool.md):**
    *   Provides a step-by-step guide and considerations for developing and integrating new core tools into the `tools/` directory.

*   **Dashboard Development:**
    *   **[Extending the VANA Monitoring Dashboard](../guides/extending-dashboard.md):** General guide on how to add new views or functionalities to the Flask API backend or Streamlit frontend UI of the dashboard.
    *   **[Extending Monitoring Capabilities](extending-monitoring.md):** (If this file details how to add new metrics or data sources to the monitoring system beyond just UI changes.)

*   **Testing Strategy (Overview):**
    *   VANA aims for comprehensive testing, including:
        *   **Unit Tests:** For individual modules and classes (e.g., in the `tests/` directory).
        *   **Integration Tests:** To verify interactions between different VANA components.
        *   **End-to-End (E2E) Tests:** For testing complete workflows or agent behaviors.
        *   **Performance Tests:** For evaluating performance characteristics of components.
        *   **Health Check Scripts:** Scripts like `scripts/test_vector_search_health.py` serve as on-demand diagnostic tests.
    *   The `CONTRIBUTING.md` file should contain more specific details on running tests and writing new ones.
    *   The project may also include an automated testing framework (e.g., `scripts/run_vana_tests.sh`, `scripts/juno_autonomous_tester.py` if current).

*   **Vector Search Testing:**
    *   **Test Fixtures:** VANA provides reusable test fixtures for Vector Search components in `tests/fixtures/vector_search_fixtures.py`:
        *   `mock_vector_search_client`: A configurable mock client for testing with simulated success/error conditions.
        *   `patched_vector_search_client`: Patches the `VectorSearchClient` class to use the mock client.
        *   `real_vector_search_client`: A real client configured for test environments.
        *   `vector_search_health_checker`: A health checker fixture that can use either mock or real clients.
    *   **Integration Tests:** Tests in `tests/integration/` verify interactions between Vector Search and other components.
    *   **Performance Tests:** Tests in `tests/performance/` evaluate the performance characteristics of Vector Search operations.

*   **Logging:**
    *   Understand how to use VANA's logging system for debugging and operational messages. See [Interpreting VANA Logs Guide](../guides/interpreting-logs.md) and [Logging System Implementation](../implementation/logging-system.md).

*   **Resilience Patterns:**
    *   Familiarize yourself with resilience patterns like Circuit Breakers used in VANA when interacting with external services. See [Resilience Patterns Implementation](../implementation/resilience-patterns.md).

## Debugging

*   Utilize VANA's logging system extensively. Set `LOG_LEVEL=DEBUG` in your `.env` file for verbose output during development.
*   Use Python debuggers (e.g., `pdb`, or your IDE's debugger).
*   For dashboard issues, check both Flask API logs and Streamlit console output, as well as the browser's developer console.

This section will be expanded as more development-specific guides and best practices are established. Always refer to `CONTRIBUTING.md` for the latest development process requirements.
