# Current Memory Tools Implementation

[Home](../../index.md) > [Implementation](../index.md) > Current Memory Tools

This document describes the current implementation and approach to "memory" for the conceptual VANA single agent. As of the current VANA architecture, dedicated short-term or long-term memory buffer tools (like those seen in some agent frameworks) are not explicitly implemented as standalone components in the `tools/` directory. Instead, memory functionalities are primarily realized through the capabilities of existing tools, especially the `KnowledgeGraphManager` and potentially how the agent orchestrates information flow.

## 1. Overview of Memory in VANA

For the Phase 1 MVP (functional single agent), "memory" can be understood in a few ways:

1.  **Persistent Structured Knowledge (Long-Term Memory):** This is primarily handled by the **MCP Knowledge Graph** accessed via the `KnowledgeGraphManager`. The agent can store facts, entities, relationships, and learned information in the KG for long-term persistence and retrieval.
2.  **Contextual Information from Searches (Working Memory):** Results obtained from `VectorSearchClient`, `WebSearchClient`, and `EnhancedHybridSearch` serve as a form of working memory or context for the agent's current task. The agent needs to manage and utilize this information effectively during its operation.
3.  **Configuration as Static Memory:** System configurations loaded via `config/environment.py` act as a form of static, pre-programmed memory regarding how the system should behave and connect to services.
4.  **Cline's Memory Bank (Meta-Memory for Development):** The `/memory-bank/` directory itself serves as a meta-level persistent memory for Cline (the AI assistant developing Vana), crucial for maintaining context across development sessions. This is distinct from the Vana agent's own operational memory.

This document focuses on how the VANA agent itself might achieve memory-like functions using the existing toolset.

## 2. `KnowledgeGraphManager` as Primary Long-Term Memory

The `tools/knowledge_graph/knowledge_graph_manager.py` is the closest VANA currently has to an explicit memory storage and retrieval tool for the agent.

*   **Storing Information:**
    *   The agent can learn new facts or relationships during its operations (e.g., from user interaction, document processing, or web searches).
    *   It can then use `kg_manager.add_entity()` and `kg_manager.add_relation()` to store this structured information persistently in the MCP Knowledge Graph.
    *   Observations associated with entities can store textual details or unstructured notes.
*   **Retrieving Information:**
    *   The agent can use `kg_manager.get_entity()` or more complex query methods (if implemented in `KnowledgeGraphManager` or directly via MCP queries) to retrieve stored knowledge.
    *   This allows the agent to recall past information, understand relationships between concepts it has learned, and use this structured memory to inform its decisions.
*   **Example Use Case:**
    1.  User tells the VANA agent: "My preferred data storage region is `us-east1`."
    2.  Agent parses this and decides to store it.
    3.  Agent calls: `kg_manager.add_entity(name="UserPreferences", entity_type="Configuration", observations=["PreferredRegion: us-east1"])` or creates a more structured representation like an entity "User" related to an entity "us-east1" via a "prefersRegion" relationship.
    4.  Later, when needing to deploy a resource, the agent queries the KG via `kg_manager` to retrieve this preference.

## 3. Search Results as Working Memory

*   When the VANA agent uses `EnhancedHybridSearch` (or its constituent clients like `VectorSearchClient`), the results returned (e.g., document chunks, web snippets, KG facts) form a temporary, contextual working memory for the current task.
*   The agent's internal logic must be designed to:
    *   Hold these results.
    *   Select relevant pieces of information from them.
    *   Synthesize them to generate a response or perform an action.
    *   Decide if any of this new information should be committed to long-term memory (i.e., the Knowledge Graph).
*   There isn't a dedicated "scratchpad" or "short-term buffer" tool in `tools/` for this yet; it's an implicit function of how the agent manages data internally during a single operational cycle.

## 4. Implicit State Management in Agent Core (Conceptual)

The (conceptual) Vana Single Agent itself will need to manage its own internal state during an interaction or task. This state management could be considered a form of short-term operational memory.
*   This would likely be implemented within the agent's main class or orchestrator logic.
*   It might involve storing conversation history, current task parameters, intermediate results, etc., in instance variables or a dedicated state object.
*   This "memory" is typically transient and lasts for the duration of a task or interaction unless explicitly persisted (e.g., to the KG).

## 5. Future Considerations for Dedicated Memory Tools

As VANA evolves, especially towards a Multi-Agent System (Phase 2), more explicit and sophisticated memory tools might be developed:

*   **Short-Term Memory Buffer:** A tool to explicitly manage a "scratchpad" or short-term buffer for conversation history, recent observations, or intermediate thoughts of an agent. This could have features like summarization, relevance scoring for retrieval, and time-decay.
*   **Long-Term Episodic/Semantic Memory:** While the KG serves as a form of semantic memory, a dedicated tool abstracting different types of long-term storage (e.g., vector stores for episodic memory, relational databases for other structured data) could be beneficial.
*   **Memory Consolidation/Summarization Tools:** Tools that periodically review and consolidate information from short-term buffers or raw KG entries into more refined knowledge.
*   **Unified Memory Interface:** An abstraction layer that provides a single interface for the agent to interact with different types of memory (short-term, long-term, KG, vector DB) without needing to know the specifics of each.

## 6. Current Implementation Focus

For the current MVP, the emphasis is on:
1.  Ensuring the `KnowledgeGraphManager` is robust and can effectively be used by the agent for persistent storage and retrieval of structured knowledge.
2.  Designing the agent's core logic to effectively utilize the contextual information retrieved from search tools as its working memory for ongoing tasks.

No separate `MemoryTool.py` exists in `tools/` at this stage that provides general-purpose agent memory buffers beyond what the KG and search result management offer. The "memory" capabilities are emergent from the use of these existing tools.
