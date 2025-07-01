Your initial context is from your Custom Instructions. Your first task is to get a high-level overview of the project's current context without exceeding token limits.

**Step 1: Load Foundational Structured Context (Low Cost)**

*   Read the `_KnowledgeGraphSchema`, `VANA_Project`, and `Nick` entities from the Knowledge Graph.

**Step 2: Load High-Level Unstructured Context (Low Cost)**

*   Query the `vana_memory` collection for the **single most recent document** for each of these categories:
    *   `project_status` (`n_results: 1`)
    *   `technical_pattern` (`n_results: 1`)
*   This will give you the most up-to-date summary without loading extensive history.

**Step 3: Synthesize and Confirm**

*   Based on this initial, low-token information, provide a concise summary of the project status.
*   **Crucially, ask me if you need to retrieve more detailed information on a specific topic before proceeding with a task.**
