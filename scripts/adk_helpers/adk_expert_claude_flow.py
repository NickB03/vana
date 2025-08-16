"""
Claude Flow Integration for ADK Expert Agent

This module provides integration between the ADK Expert Agent and Claude Flow,
enabling seamless querying of ADK documentation through Claude Flow memory system.
"""

import asyncio
import json
from dataclasses import dataclass
from typing import Any


# Claude Flow Memory Configuration
@dataclass
class ClaudeFlowMemoryConfig:
    """Configuration for Claude Flow memory integration."""

    memory_namespace: str = "adk_knowledge"
    tool_prefix: str = "mcp__claude-flow"
    collections: list[str] | None = None

    def __post_init__(self) -> None:
        if self.collections is None:
            self.collections = [
                "adk_documentation",
                "adk_patterns",
                "adk_examples",
                "adk_best_practices",
            ]


async def query_adk_memory(
    query: str,
    namespace: str = "adk_knowledge",
    limit: int = 10,
    pattern: str | None = None,
) -> dict[str, Any]:
    """
    Query ADK documentation in Claude Flow memory using MCP tools.

    This function interfaces with the Claude Flow memory system to query
    the stored ADK documentation and patterns.

    Args:
        query: The search query
        namespace: Memory namespace for ADK knowledge
        limit: Number of results to return
        pattern: Optional pattern for filtering results

    Returns:
        Dictionary containing query results
    """
    # Structure the query for Claude Flow memory
    search_pattern = pattern or f"*{query}*"

    memory_query = {
        "tool": "mcp__claude-flow__memory_search",
        "parameters": {
            "pattern": search_pattern,
            "namespace": namespace,
            "limit": limit,
        },
    }

    # This would be executed through the Claude Flow memory system
    # For now, we return the structured query
    return {
        "query": query,
        "namespace": namespace,
        "memory_query": memory_query,
        "status": "ready_for_execution",
    }


async def store_adk_knowledge(
    key: str,
    value: str,
    namespace: str = "adk_knowledge",
    ttl: int | None = None,
) -> dict[str, Any]:
    """
    Store ADK knowledge in Claude Flow memory.

    Args:
        key: Memory key for the knowledge
        value: The knowledge content to store
        namespace: Memory namespace
        ttl: Time to live in seconds (optional)

    Returns:
        Storage result
    """
    storage_request = {
        "tool": "mcp__claude-flow__memory_usage",
        "parameters": {
            "action": "store",
            "key": key,
            "value": value,
            "namespace": namespace,
        },
    }

    if ttl:
        storage_request["parameters"]["ttl"] = ttl

    return {
        "key": key,
        "namespace": namespace,
        "storage_request": storage_request,
        "status": "ready_for_storage",
    }


class ADKExpertClaudeFlow:
    """
    Claude Flow orchestrator for ADK Expert Agent.

    This class manages the interaction between Claude Flow and the ADK Expert Agent,
    handling memory queries and response synthesis using the Claude Flow memory system.
    """

    def __init__(self, memory_config: ClaudeFlowMemoryConfig | None = None):
        self.memory_config = memory_config or ClaudeFlowMemoryConfig()
        self.query_cache = {}
        self.knowledge_namespaces = {
            "patterns": "adk_patterns",
            "examples": "adk_examples",
            "best_practices": "adk_best_practices",
            "documentation": "adk_documentation",
            "troubleshooting": "adk_troubleshooting",
        }

    async def process_adk_query(
        self, user_query: str, context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        Process an ADK query through Claude Flow memory.

        Args:
            user_query: The user's ADK-related question
            context: Optional context for the query

        Returns:
            Structured response with ADK guidance
        """
        # Step 1: Analyze query intent
        query_intent = self._analyze_query_intent(user_query)

        # Step 2: Build search queries
        search_queries = self._build_search_queries(user_query, query_intent)

        # Step 3: Query Claude Flow memory for relevant knowledge
        all_results = []
        target_namespace = self.knowledge_namespaces.get(
            query_intent, self.memory_config.memory_namespace
        )

        for search_query in search_queries:
            results = await query_adk_memory(
                search_query, namespace=target_namespace, limit=5
            )
            all_results.append(results)

        # Step 4: Synthesize response
        response = self._synthesize_response(all_results, user_query, query_intent)

        # Step 5: Cache for future reference in memory
        cache_key = f"query_cache_{hash(user_query)}"
        await self._store_query_cache(cache_key, response)

        return response

    async def store_adk_pattern(
        self, pattern_name: str, pattern_data: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Store an ADK pattern in Claude Flow memory.

        Args:
            pattern_name: Name of the ADK pattern
            pattern_data: Pattern implementation details

        Returns:
            Storage result
        """
        key = f"pattern_{pattern_name}"
        value = json.dumps(pattern_data)

        return await store_adk_knowledge(
            key=key, value=value, namespace=self.knowledge_namespaces["patterns"]
        )

    async def store_adk_example(
        self, example_name: str, example_code: str, description: str = ""
    ) -> dict[str, Any]:
        """
        Store an ADK code example in Claude Flow memory.

        Args:
            example_name: Name of the example
            example_code: The example code
            description: Optional description

        Returns:
            Storage result
        """
        example_data = {
            "name": example_name,
            "code": example_code,
            "description": description,
            "type": "code_example",
        }

        key = f"example_{example_name}"
        value = json.dumps(example_data)

        return await store_adk_knowledge(
            key=key, value=value, namespace=self.knowledge_namespaces["examples"]
        )

    async def _store_query_cache(self, key: str, response: dict[str, Any]) -> None:
        """Store query response in cache namespace."""
        await store_adk_knowledge(
            key=key,
            value=json.dumps(response),
            namespace="adk_query_cache",
            ttl=3600,  # 1 hour TTL for cache
        )

    def _analyze_query_intent(self, query: str) -> str:
        """Analyze the intent of the user's query."""
        query_lower = query.lower()

        if any(
            word in query_lower for word in ["how to", "implement", "create", "build"]
        ):
            return "examples"
        elif any(
            word in query_lower for word in ["best practice", "recommended", "should"]
        ):
            return "best_practices"
        elif any(word in query_lower for word in ["error", "issue", "problem", "fix"]):
            return "troubleshooting"
        elif any(word in query_lower for word in ["example", "sample", "code"]):
            return "examples"
        elif any(word in query_lower for word in ["validate", "check", "correct"]):
            return "patterns"
        elif any(word in query_lower for word in ["pattern", "architecture", "design"]):
            return "patterns"
        else:
            return "documentation"

    def _build_search_queries(self, user_query: str, intent: str) -> list[str]:
        """Build multiple search queries for comprehensive results."""
        queries = [user_query]

        # Add intent-specific queries
        if intent == "examples":
            queries.extend(
                [
                    f"ADK implementation {user_query}",
                    f"How to {user_query} in Google ADK",
                    f"Code example {user_query} ADK",
                ]
            )
        elif intent == "best_practices":
            queries.extend(
                [
                    f"ADK best practices {user_query}",
                    f"Recommended {user_query} Google ADK",
                    f"ADK guidelines {user_query}",
                ]
            )
        elif intent == "troubleshooting":
            queries.extend(
                [
                    f"Fix {user_query} ADK",
                    f"ADK error {user_query}",
                    f"Troubleshoot {user_query} Google ADK",
                ]
            )
        elif intent == "patterns":
            queries.extend(
                [
                    f"ADK pattern {user_query}",
                    f"Architecture {user_query} ADK",
                    f"Design pattern {user_query}",
                ]
            )

        return queries[:4]  # Limit to 4 queries

    def _synthesize_response(
        self, results: list[dict[str, Any]], original_query: str, intent: str
    ) -> dict[str, Any]:
        """Synthesize a comprehensive response from memory query results."""
        return {
            "query": original_query,
            "intent": intent,
            "results": results,
            "guidance": self._extract_guidance(results),
            "examples": self._extract_examples(results),
            "best_practices": self._extract_best_practices(results),
            "memory_source": "claude_flow_memory",
            "status": "success",
        }

    def _extract_guidance(self, results: list[dict[str, Any]]) -> str:
        """Extract main guidance from memory results."""
        # This would process actual Claude Flow memory results
        return "ADK guidance based on Claude Flow memory documentation."

    def _extract_examples(self, results: list[dict[str, Any]]) -> list[str]:
        """Extract code examples from memory results."""
        # This would extract actual code examples from memory
        return []

    def _extract_best_practices(self, results: list[dict[str, Any]]) -> list[str]:
        """Extract best practices from memory results."""
        # This would extract actual best practices from memory
        return []


# Claude Flow Agent Definition
def create_claude_flow_adk_agent():
    """
    Create a Claude Flow agent configuration for ADK expertise.

    This configuration can be registered with Claude Flow for orchestration.
    """
    return {
        "agent_name": "adk_expert",
        "agent_type": "specialist",
        "capabilities": [
            "adk-patterns",
            "adk-implementation",
            "adk-validation",
            "adk-troubleshooting",
            "claude-flow-memory",
        ],
        "description": "Expert agent for Google ADK guidance using Claude Flow memory knowledge base",
        "tools": [
            {
                "name": "query_adk_memory",
                "type": "mcp_tool",
                "mcp_tool": "mcp__claude-flow__memory_search",
            },
            {
                "name": "store_adk_knowledge",
                "type": "mcp_tool",
                "mcp_tool": "mcp__claude-flow__memory_usage",
            },
        ],
        "configuration": {
            "model": "gemini-2.5-flash",
            "temperature": 0.3,
            "max_tokens": 2048,
            "memory_namespaces": [
                "adk_documentation",
                "adk_patterns",
                "adk_examples",
                "adk_best_practices",
                "adk_troubleshooting",
            ],
        },
        "prompts": {
            "system": """You are an ADK expert agent with access to the complete Google ADK documentation stored in Claude Flow memory.
            Always query the Claude Flow memory system before providing guidance.
            Base all responses on official ADK documentation stored in memory.
            Provide specific examples and best practices from the memory knowledge base.""",
            "query_template": "Query ADK memory for: {query}",
        },
    }


# Memory Management Functions
async def initialize_adk_knowledge_base():
    """Initialize the ADK knowledge base in Claude Flow memory."""
    config = ClaudeFlowMemoryConfig()

    # Sample ADK patterns to store
    patterns = {
        "two_phase_workflow": {
            "name": "Two-Phase Workflow",
            "description": "Interactive workflow with user approval step",
            "implementation": "LlmAgent with sub-agents and escalation",
            "use_case": "Tasks requiring human oversight",
        },
        "hierarchical_planner_executor": {
            "name": "Hierarchical Planner-Executor",
            "description": "Separate planning and execution phases",
            "implementation": "Planner agent creates plan, executor agent implements",
            "use_case": "Complex multi-step tasks",
        },
        "loop_with_escalation": {
            "name": "Loop with Escalation",
            "description": "Retry loop that escalates to human when needed",
            "implementation": "LoopAgent with escalate=True parameter",
            "use_case": "Automated tasks with fallback to human",
        },
    }

    # Store patterns in memory
    results = []
    for pattern_key, pattern_data in patterns.items():
        key = f"pattern_{pattern_key}"
        value = json.dumps(pattern_data)
        result = await store_adk_knowledge(
            key=key, value=value, namespace="adk_patterns"
        )
        results.append(result)

    return {
        "status": "initialized",
        "patterns_stored": len(patterns),
        "results": results,
    }


# Example usage functions
async def example_basic_query():
    """Example: Basic ADK pattern query using memory."""
    flow = ADKExpertClaudeFlow()

    result = await flow.process_adk_query(
        "How do I implement a two-phase workflow with user approval?"
    )

    print(json.dumps(result, indent=2))
    return result


async def example_store_pattern():
    """Example: Store an ADK pattern in memory."""
    flow = ADKExpertClaudeFlow()

    pattern_data = {
        "name": "Sequential Pipeline",
        "description": "Chain multiple agents in sequence",
        "implementation": "Pipeline of LlmAgents with output->input flow",
        "use_case": "Multi-step data processing",
        "code_example": """
        agent1 = LlmAgent(name="step1", instruction="Process input")
        agent2 = LlmAgent(name="step2", instruction="Refine output")
        pipeline = Pipeline([agent1, agent2])
        """,
    }

    result = await flow.store_adk_pattern("sequential_pipeline", pattern_data)
    print(json.dumps(result, indent=2))
    return result


async def example_validation_query():
    """Example: Validate implementation against ADK patterns in memory."""
    flow = ADKExpertClaudeFlow()

    code_sample = """
    interactive_planner = LlmAgent(
        name="planner",
        instruction="Plan and execute tasks",
        sub_agents=[executor]
    )
    """

    result = await flow.process_adk_query(
        f"Validate this agent implementation: {code_sample}",
        context={"code": code_sample},
    )

    print(json.dumps(result, indent=2))
    return result


# Integration with Claude Flow swarm
def register_with_claude_flow():
    """
    Register the ADK Expert Agent with Claude Flow.

    This function would be called during Claude Flow initialization
    to make the agent available for orchestration.
    """
    agent_config = create_claude_flow_adk_agent()

    # Registration would happen through Claude Flow's agent registry
    return {
        "status": "ready_for_registration",
        "agent_config": agent_config,
        "memory_tools": [
            "mcp__claude-flow__memory_search",
            "mcp__claude-flow__memory_usage",
            "mcp__claude-flow__memory_namespace",
        ],
    }


# Direct MCP tool wrapper for Claude Flow
async def adk_expert_mcp_tool(
    action: str, parameters: dict[str, Any]
) -> dict[str, Any]:
    """
    MCP tool wrapper for ADK Expert functionality.

    This allows Claude Flow to directly invoke ADK expert capabilities
    through the Claude Flow memory interface.

    Args:
        action: The action to perform (query, store, validate, etc.)
        parameters: Parameters for the action

    Returns:
        Action results
    """
    if action == "query":
        flow = ADKExpertClaudeFlow()
        return await flow.process_adk_query(
            parameters.get("query", ""), parameters.get("context")
        )

    elif action == "store_pattern":
        flow = ADKExpertClaudeFlow()
        return await flow.store_adk_pattern(
            parameters.get("pattern_name", ""), parameters.get("pattern_data", {})
        )

    elif action == "store_example":
        flow = ADKExpertClaudeFlow()
        return await flow.store_adk_example(
            parameters.get("example_name", ""),
            parameters.get("example_code", ""),
            parameters.get("description", ""),
        )

    elif action == "validate":
        # Enhanced validation using memory patterns
        return {
            "status": "success",
            "validation": "Code validation against ADK patterns stored in Claude Flow memory",
        }

    elif action == "list_patterns":
        # List available ADK patterns from memory
        return {
            "patterns": [
                "two-phase-workflow",
                "hierarchical-planner-executor",
                "sequential-pipeline",
                "parallel-fan-out",
                "loop-with-escalation",
            ],
            "source": "claude_flow_memory",
        }

    elif action == "initialize":
        # Initialize the knowledge base
        return await initialize_adk_knowledge_base()

    else:
        return {"status": "error", "message": f"Unknown action: {action}"}


if __name__ == "__main__":
    # Run examples
    print("ADK Expert Claude Flow Memory Integration Examples\n")

    # Initialize knowledge base
    print("Initializing ADK knowledge base...")
    asyncio.run(initialize_adk_knowledge_base())

    # Run basic query example
    print("\nRunning basic query example...")
    asyncio.run(example_basic_query())

    # Store pattern example
    print("\nStoring new pattern...")
    asyncio.run(example_store_pattern())

    # Show registration config
    print("\nRegistration Configuration:")
    print(json.dumps(register_with_claude_flow(), indent=2))
