# MVP: Single Agent Platform Implementation Plan

**Date:** 2025-05-17

**Goal:** To develop a functional single AI agent capable of understanding tasks, selecting appropriate Vana tools, executing them, and processing their outputs to achieve a defined objective. This aligns with the Phase 1 MVP goal outlined in `projectbrief.md`.

## Pre-requisites:

1.  Completion of Vector Search Enhancement Plan (Phases A-C completed; Phases D & E pending) as detailed in `docs/project/implementation-plans/vector-search-enhancement-plan.md`.
2.  All core Vana tools (`VectorSearchClient`, `DocumentProcessor`, `KnowledgeGraphManager`, `WebSearchClient`, `EnhancedHybridSearch`) are stable and tested.
3.  Environment configuration (`config/environment.py`, `.env` files) is finalized and supports all necessary services.

## Phases & Key Tasks:

### Phase 1: Agent Core Scaffolding & Basic Task Execution

**Objective:** Establish the fundamental structure of the agent and enable it to perform a very simple, predefined task using one tool.

1.  **Define Agent Architecture:**
    *   Design the basic class structure for the `VanaAgent`.
    *   Determine how the agent will receive tasks (e.g., command-line input, function call).
    *   Outline the core agent loop: receive task -> understand task -> select tool -> execute tool -> process result -> formulate response.
    *   Location: Potentially a new directory `agent/` with `agent_core.py`.
2.  **Tool Integration Mechanism:**
    *   Implement a way for the agent to discover and access the existing Vana tools (`tools/` directory).
    *   Consider a simple tool registry or direct instantiation.
3.  **Basic Task Processor:**
    *   Implement initial logic for the agent to understand a very simple, hardcoded task (e.g., "Search the web for 'current AI trends'").
4.  **Single Tool Execution (WebSearchClient):
    *   Enable the agent to select and execute the `WebSearchClient` for the predefined task.
    *   Implement basic processing of the `WebSearchClient` output.
5.  **Simple Response Generation:**
    *   Allow the agent to output the result in a structured way (e.g., print to console).
6.  **Initial Unit Tests:**
    *   Create basic unit tests for the agent's core components and the single tool execution flow.

**Deliverables:**
*   `agent/agent_core.py` with initial `VanaAgent` class.
*   Ability for the agent to execute a predefined web search task and display results.
*   Basic unit tests.

### Phase 2: Expanding Toolset & Basic Tool Selection Logic

**Objective:** Integrate more tools and implement rudimentary logic for the agent to choose between them based on the task.

1.  **Integrate `VectorSearchClient`:**
    *   Enable the agent to use `VectorSearchClient` for tasks like "Find documents related to 'XYZ'".
    *   Process and present results from vector search.
2.  **Integrate `KnowledgeGraphManager`:**
    *   Enable the agent to query the Knowledge Graph (e.g., "What is the relationship between A and B?").
3.  **Basic Tool Selection Logic:**
    *   Implement simple keyword-based or rule-based logic for the agent to select between `WebSearchClient`, `VectorSearchClient`, and `KnowledgeGraphManager` based on task input.
    *   Example: If task contains "search web" or "latest info", use `WebSearchClient`. If task contains "find documents" or "semantic search", use `VectorSearchClient`.
4.  **Unit Tests for New Tools & Selection Logic:**
    *   Add tests for the new tool integrations and the selection mechanism.

**Deliverables:**
*   Agent capable of using `WebSearchClient`, `VectorSearchClient`, and `KnowledgeGraphManager`.
*   Basic tool selection logic implemented.
*   Expanded unit tests.

### Phase 3: Integrating Remaining Tools & Enhancing Task Understanding

**Objective:** Incorporate all core Vana tools and improve the agent's ability to understand more complex or nuanced tasks.

1.  **Integrate `DocumentProcessor`:**
    *   Enable the agent to accept a file path and use `DocumentProcessor` to process it (e.g., "Process this document: /path/to/doc.pdf").
    *   Determine how the agent handles the output (e.g., summary, confirmation of processing).
2.  **Integrate `EnhancedHybridSearch`:**
    *   Allow the agent to leverage hybrid search for more comprehensive information retrieval tasks.
3.  **Improved Task Parsing/Understanding:**
    *   Explore more sophisticated methods for the agent to understand task intent (e.g., simple NLP, intent classification if feasible within MVP scope).
    *   This might involve breaking down tasks into sub-steps or identifying key entities/actions.
4.  **Refined Tool Selection Logic:**
    *   Enhance tool selection based on improved task understanding.
5.  **Comprehensive Unit & Integration Tests:**
    *   Ensure all tools and agent logic paths are well-tested.

**Deliverables:**
*   Agent capable of utilizing all core Vana tools.
*   Improved task understanding and tool selection capabilities.
*   Robust test suite.

### Phase 4: Agent Interface, Logging, and Basic Error Handling

**Objective:** Provide a usable interface for interacting with the agent, implement logging, and add basic error handling.

1.  **Simple Command-Line Interface (CLI):**
    *   Develop a basic CLI for users to input tasks to the agent.
    *   The CLI should display agent responses and status.
2.  **Structured Logging:**
    *   Implement logging throughout the agent's operations (task received, tool selected, tool executed, errors, results).
3.  **Basic Error Handling & Resilience:**
    *   Implement try-except blocks for tool execution.
    *   Provide informative error messages to the user if a task cannot be completed.
    *   Consider how the agent might retry a failed step or suggest alternatives.
4.  **User Feedback Mechanism (Conceptual):**
    *   Think about how a user might provide feedback on the agent's performance (not necessarily for full implementation in MVP, but to consider for future).

**Deliverables:**
*   A functional CLI for the Vana agent.
*   Structured logging for agent activities.
*   Basic error handling.

## Documentation & Progress Tracking:

*   This plan will be updated as work progresses.
*   `activeContext.md` will reflect the current phase and task.
*   `progress.md` will log completed tasks and phases.
*   Code documentation (docstrings, comments) will be maintained for all new agent components.

## Next Steps (Immediate):

1.  Confirm completion of Vector Search Enhancement Plan (Phases A-E).
2.  Begin Phase 1: Agent Core Scaffolding & Basic Task Execution.
