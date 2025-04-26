adk_key_knowledge.md
# ADK (Agent Development Kit) - Tactical Knowledge for Vana Project

---

## What is ADK?
- The Agent Development Kit (ADK) is a lightweight open-source framework for building autonomous agents.
- It provides agents with structured behavior based on intents, tools, memory, observations, and external communication.
- Designed for modularity, lightweight local operations, and external integration with systems like MCP (Model Context Protocol) servers.

## Core Concepts

### Intents
- Intents represent an agent's internal goal or purpose.
- They are formulated during agent planning steps and serve as a guide for tool invocation.
- Intents can be dynamic (generated during execution) or static (predefined).

### Tools
- Tools are modular capabilities agents invoke to fulfill intents.
- Each tool consists of:
  - A unique name
  - An OpenAPI 3.0-compliant input/output schema
  - A runtime execution handler (local function or external call)
- Tools can be dynamically registered and selected based on the current context.
- Tools have minimal coupling: they operate independently of agent internal state.

### Observations
- Observations are records created after tool usage.
- They can be:
  - Successful outputs
  - Failures or exceptions
  - Environmental feedback (external state changes)
- Observations are key for updating agent memory and for downstream task decomposition.

## Agent Configuration

- Agents are configured declaratively.
- Core configuration fields:
  - `intents`: List or template of intents the agent can generate.
  - `tools`: Available tool inventory.
  - `memory`: Type and settings of internal memory (e.g., vector memory, history buffer).
  - `policies`: Execution behaviors (e.g., fallback strategies, error recovery policies).
  - `communication`: Settings for remote messaging and context synchronization (via MCP).
  - `serialization`: (Optional) how to persist agent state if needed.

## Memory System
- ADK supports modular memory plugins.
- Supported types:
  - Stateless (short-term working memory)
  - Vector-based long-term memory (e.g., using external vector stores)
- Memory operations include:
  - Retrieve past observations
  - Contextual retrieval based on embedding similarity
  - Insert/update new memory chunks

## Tool System Overview
- Tools are standalone actors.
- Tool invocation flow:
  1. Agent selects intent
  2. Agent matches suitable tool
  3. Agent validates input schema
  4. Tool executes and returns observation
  5. Agent records observation, decides next step
- Tools can be local (Python code) or remote (external API calls).

### Tool Properties
- Versioning supported.
- Chaining tools is allowed but agent controls the flow.
- Rate limiting and fallback configuration possible per tool.

## External Communication (MCP Servers)
- ADK includes built-in schemas for connecting to MCP-compatible servers.
- Capabilities include:
  - Pushing observations to a shared context pool
  - Pulling environmental updates
  - Triggering remote tool executions when local capabilities are insufficient
  - Agent-to-agent collaboration via shared intents and observations
- MCP messages are structured and schema-validated.

## Deployment Best Practices
- **Isolation**: Run agents in Docker containers for safety.
- **Observation Auditing**: Log every tool invocation and observation persistently.
- **Minimal Initial Toolset**: Start agents with few critical tools; expand after stability.
- **Resource Watchdogs**: Monitor memory, CPU, and network usage if deploying at scale.
- **Externalization of Memory**: For agents needing continuity, external vector stores or MCP sync is critical.

## Relevance to Vana Project
- Intents: Design Phase 1 Vana agent tasks as intent-driven plans.
- Tools: Plug in RAG retrieval first; add tool invocation modularly (e.g., search tools, summary tools).
- Observations: Ensure every action is logged, available for later review.
- Memory: Immediate external memory (Ragie) critical for Phase 1; internal ADK memory optional but alignable.
- MCP Servers: Target Phase 2 extension for distributed multi-agent architecture with Brave/Context7.

---

# End of Tactical Extraction (Phase 1)

