# Adding a New Tool to VANA Guide

[Home](../../index.md) > [Guides](../index.md) > Adding a New Tool

This guide outlines the general process and considerations for adding a new core tool to the VANA system, typically within the `tools/` directory. VANA is designed to be modular, and new tools can extend its capabilities.

## 1. Overview

Adding a new tool to VANA involves more than just writing the Python code. It requires consideration of configuration, integration with existing systems (like the conceptual agent or hybrid search), logging, error handling, and documentation.

A "tool" in this context usually refers to a Python class or module that encapsulates a specific functionality, such as interacting with a new external API, performing a unique data transformation, or implementing a new type of analysis.

## 2. Design Considerations Before Coding

Before writing code for a new tool, consider the following:

*   **Purpose and Scope:**
    *   What problem does this tool solve?
    *   What are its specific inputs and outputs?
    *   How does it fit into the overall VANA architecture and goals (e.g., supporting the agent, enhancing search, providing new processing capabilities)?
*   **External Dependencies:**
    *   Does the tool rely on external APIs or services? If so, how will authentication be handled? What are the rate limits and costs?
    *   Does it require new Python libraries? Add them to the relevant `requirements.txt` (e.g., `dashboard/requirements.txt` or a future root `requirements.txt`).
    *   Does it require external software (like Tesseract for OCR)? Document this dependency.
*   **Configuration:**
    *   What settings will the tool need (e.g., API keys, endpoints, behavior flags)? These should be managed via `config/environment.py` and `.env` files.
*   **Integration Points:**
    *   How will other VANA components (e.g., the Vana Agent, `EnhancedHybridSearch`) use this tool? Define a clear interface (e.g., public methods of a class).
    *   Will it be part of a data processing pipeline or a standalone utility?
*   **Error Handling and Resilience:**
    *   What are the common failure modes?
    *   How should errors be handled and reported?
    *   Should resilience patterns like retries or circuit breakers be used (especially for external API calls)?
*   **Logging:**
    *   What information should be logged for operational monitoring and debugging? Use VANA's standard logging utilities (`tools/logging/`).
*   **Testing:**
    *   How will the tool be unit tested?
    *   How will its integration with other components be tested?
    *   Consider creating a mock version or mode for testing dependents without live external calls.

## 3. Development Steps

### 3.1. Create the Tool Module
1.  **Directory Structure:** Create a new subdirectory within `tools/` if the tool is complex or has multiple related files (e.g., `tools/new_tool_name/`). For a simple tool, a single Python file (e.g., `tools/new_tool_name_client.py`) might suffice.
    *   Include an `__init__.py` in the new subdirectory to make it a package.
2.  **Implement the Core Logic:**
    *   Write the Python class(es) or functions that provide the tool's functionality.
    *   Follow VANA's coding standards (see `CONTRIBUTING.md` or `docs/development/coding_standards.md` when available).
    *   Use type hinting.
    *   Write clear docstrings for modules, classes, and methods.

### 3.2. Configuration
1.  Identify all necessary configuration parameters for your tool.
2.  Add these parameters to `.env.example` with placeholder values and comments.
3.  Update `config/environment.py` to load, parse (with type conversion and defaults if needed), and expose these new settings.
4.  Ensure your tool reads its configuration from `config.environment`.

### 3.3. Logging
1.  Import and use the VANA logger (e.g., `from tools.logging.logger import get_logger`).
2.  Instantiate a logger for your module (e.g., `logger = get_logger(__name__)`).
3.  Add appropriate log messages at different levels (DEBUG, INFO, WARNING, ERROR).
    *   Log important actions, decisions, and outcomes at INFO.
    *   Log detailed diagnostic information at DEBUG.
    *   Log potential issues or non-critical failures at WARNING.
    *   Log errors that prevent successful operation at ERROR.

### 3.4. Error Handling
1.  Implement robust error handling using `try...except` blocks.
2.  Define custom exceptions if appropriate (e.g., `NewToolAPIError`, `NewToolConfigurationError`) in an `exceptions.py` file within your tool's directory.
3.  Ensure errors from external dependencies (APIs, libraries) are caught and handled gracefully, possibly by re-raising them as custom exceptions or returning a clear error state.

### 3.5. Unit Tests
1.  Create unit tests for your new tool in the `tests/` directory (e.g., `tests/tools/test_new_tool_name.py`).
2.  Use the `unittest` or `pytest` framework (check project conventions).
3.  Mock external dependencies (e.g., API calls) to ensure tests are isolated and repeatable. The `unittest.mock` module is useful here.
4.  Aim for good test coverage of your tool's functionality, including edge cases and error conditions.

### 3.6. Integration (Conceptual)
*   If the tool is to be used by the Vana Agent, update the agent's logic to initialize and call the new tool.
*   If it's a new search source for `EnhancedHybridSearch`, modify `EnhancedHybridSearch` to include it.
*   If it's part of a document processing flow, integrate it into the relevant pipeline.

## 4. Documentation

Comprehensive documentation is crucial for any new tool.

1.  **User Guide (`docs/guides/`):**
    *   Create a new `new-tool-name-usage.md` file.
    *   Explain what the tool does, its prerequisites, how to initialize it, how to use its main functions (with code examples), and common troubleshooting tips.
2.  **Implementation Details (`docs/implementation/`):**
    *   Create a new `new-tool-name.md` file.
    *   Describe the internal workings of the tool, its interaction with external services, key classes/methods, and any complex logic. Include Mermaid diagrams if helpful for illustrating flow or components.
3.  **Architecture Document (`docs/architecture/`):**
    *   If the new tool significantly impacts the overall VANA architecture or introduces a new architectural component, update relevant architecture documents (e.g., `overview.md`) or create a new one (e.g., `new-tool-architecture.md`).
4.  **Root `README.md`:**
    *   Briefly mention the new tool in the "Features" or "Key Components" sections if it's a major addition.
5.  **`docs/index.md` and other `index.md` files:**
    *   Add links to your new documentation pages in the main documentation index and relevant sub-indexes.
6.  **Docstrings:** Ensure all public classes, methods, and functions in your tool's code have clear, informative docstrings. These can potentially be used by auto-documentation tools like Sphinx in the future.

## 5. Updating Project Files

*   **`requirements.txt`:** If your tool adds new Python dependencies, update the appropriate `requirements.txt` file (e.g., `dashboard/requirements.txt` or the future root `requirements.txt`).
*   **`__init__.py` files:** Ensure your new tool's main classes/functions are easily importable by adding them to the `__all__` list in the relevant `__init__.py` files if that's a project pattern.
*   **`CONTRIBUTING.md` (if applicable):** If the new tool introduces specific development patterns or testing requirements, consider if `CONTRIBUTING.md` needs an update.

## 6. Review and Testing

*   **Code Review:** Follow the project's pull request and code review process.
*   **Manual Testing:** Perform manual tests to ensure the tool works as expected in a VANA environment.
*   **Integration Testing:** Test how the new tool interacts with other parts of VANA.

By following these steps, you can add new tools to VANA in a structured, maintainable, and well-documented way, enhancing the overall capabilities of the system.
