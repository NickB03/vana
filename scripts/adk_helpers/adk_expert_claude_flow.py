"""
Claude Flow Integration for ADK Expert Agent

This module provides integration between the ADK Expert Agent and Claude Flow,
enabling seamless querying of ADK documentation through MCP ChromaDB tools.
"""

import asyncio
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

# MCP Tool Integration for ChromaDB
@dataclass
class MCPChromaConfig:
    """Configuration for MCP ChromaDB integration."""
    tool_prefix: str = "mcp__chroma-vana"
    collections: List[str] = None
    
    def __post_init__(self):
        if self.collections is None:
            self.collections = [
                "adk_documentation",
                "adk_knowledge_base_v2"
            ]


async def query_adk_chromadb(
    query: str,
    collection_name: str = "adk_documentation",
    n_results: int = 10,
    filter_dict: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Query ADK documentation in ChromaDB using MCP tools.
    
    This function interfaces with the MCP ChromaDB tool to query
    the indexed ADK documentation.
    
    Args:
        query: The search query
        collection_name: Name of the ChromaDB collection
        n_results: Number of results to return
        filter_dict: Optional metadata filters
        
    Returns:
        Dictionary containing query results
    """
    # Structure the query for MCP tool
    mcp_query = {
        "tool": "mcp__chroma-vana__chroma_query_documents",
        "parameters": {
            "collection_name": collection_name,
            "query_texts": [query],
            "n_results": n_results
        }
    }
    
    if filter_dict:
        mcp_query["parameters"]["where"] = filter_dict
    
    # This would be executed through the MCP tool system
    # For now, we return the structured query
    return {
        "query": query,
        "collection": collection_name,
        "mcp_query": mcp_query,
        "status": "ready_for_execution"
    }


class ADKExpertClaudeFlow:
    """
    Claude Flow orchestrator for ADK Expert Agent.
    
    This class manages the interaction between Claude Flow and the ADK Expert Agent,
    handling ChromaDB queries and response synthesis.
    """
    
    def __init__(self, mcp_config: Optional[MCPChromaConfig] = None):
        self.mcp_config = mcp_config or MCPChromaConfig()
        self.query_cache = {}
    
    async def process_adk_query(
        self,
        user_query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process an ADK query through Claude Flow.
        
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
        
        # Step 3: Query ChromaDB collections
        all_results = []
        for collection in self.mcp_config.collections:
            for search_query in search_queries:
                results = await query_adk_chromadb(
                    search_query,
                    collection_name=collection,
                    n_results=5
                )
                all_results.append(results)
        
        # Step 4: Synthesize response
        response = self._synthesize_response(all_results, user_query, query_intent)
        
        # Step 5: Cache for future reference
        self.query_cache[user_query] = response
        
        return response
    
    def _analyze_query_intent(self, query: str) -> str:
        """Analyze the intent of the user's query."""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["how to", "implement", "create", "build"]):
            return "implementation"
        elif any(word in query_lower for word in ["best practice", "recommended", "should"]):
            return "best_practice"
        elif any(word in query_lower for word in ["error", "issue", "problem", "fix"]):
            return "troubleshooting"
        elif any(word in query_lower for word in ["example", "sample", "code"]):
            return "example"
        elif any(word in query_lower for word in ["validate", "check", "correct"]):
            return "validation"
        else:
            return "pattern"
    
    def _build_search_queries(self, user_query: str, intent: str) -> List[str]:
        """Build multiple search queries for comprehensive results."""
        queries = [user_query]
        
        # Add intent-specific queries
        if intent == "implementation":
            queries.extend([
                f"ADK implementation {user_query}",
                f"How to {user_query} in Google ADK",
                f"Code example {user_query} ADK"
            ])
        elif intent == "best_practice":
            queries.extend([
                f"ADK best practices {user_query}",
                f"Recommended {user_query} Google ADK",
                f"ADK guidelines {user_query}"
            ])
        elif intent == "troubleshooting":
            queries.extend([
                f"Fix {user_query} ADK",
                f"ADK error {user_query}",
                f"Troubleshoot {user_query} Google ADK"
            ])
        
        return queries[:4]  # Limit to 4 queries
    
    def _synthesize_response(
        self,
        results: List[Dict[str, Any]],
        original_query: str,
        intent: str
    ) -> Dict[str, Any]:
        """Synthesize a comprehensive response from query results."""
        return {
            "query": original_query,
            "intent": intent,
            "results": results,
            "guidance": self._extract_guidance(results),
            "examples": self._extract_examples(results),
            "best_practices": self._extract_best_practices(results),
            "status": "success"
        }
    
    def _extract_guidance(self, results: List[Dict[str, Any]]) -> str:
        """Extract main guidance from results."""
        # This would process actual ChromaDB results
        return "ADK guidance based on ChromaDB documentation."
    
    def _extract_examples(self, results: List[Dict[str, Any]]) -> List[str]:
        """Extract code examples from results."""
        # This would extract actual code examples
        return []
    
    def _extract_best_practices(self, results: List[Dict[str, Any]]) -> List[str]:
        """Extract best practices from results."""
        # This would extract actual best practices
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
            "chromadb-query"
        ],
        "description": "Expert agent for Google ADK guidance using ChromaDB knowledge base",
        "tools": [
            {
                "name": "query_adk_chromadb",
                "type": "mcp_tool",
                "mcp_tool": "mcp__chroma-vana__chroma_query_documents"
            }
        ],
        "configuration": {
            "model": "gemini-2.5-flash",
            "temperature": 0.3,
            "max_tokens": 2048,
            "collections": [
                "adk_documentation",
                "adk_knowledge_base_v2"
            ]
        },
        "prompts": {
            "system": """You are an ADK expert agent with access to the complete Google ADK documentation indexed in ChromaDB.
            Always query the ChromaDB collections before providing guidance.
            Base all responses on official ADK documentation.
            Provide specific examples and best practices from the documentation.""",
            "query_template": "Query ADK documentation for: {query}"
        }
    }


# Example usage functions
async def example_basic_query():
    """Example: Basic ADK pattern query."""
    flow = ADKExpertClaudeFlow()
    
    result = await flow.process_adk_query(
        "How do I implement a two-phase workflow with user approval?"
    )
    
    print(json.dumps(result, indent=2))
    return result


async def example_validation_query():
    """Example: Validate implementation against ADK patterns."""
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
        context={"code": code_sample}
    )
    
    print(json.dumps(result, indent=2))
    return result


async def example_troubleshooting():
    """Example: Troubleshoot ADK issue."""
    flow = ADKExpertClaudeFlow()
    
    result = await flow.process_adk_query(
        "Why is my LoopAgent not terminating when escalate=True?"
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
    # For now, we return the configuration
    return {
        "status": "ready_for_registration",
        "agent_config": agent_config,
        "mcp_tools": [
            "mcp__chroma-vana__chroma_query_documents",
            "mcp__chroma-vana__chroma_list_collections"
        ]
    }


# Direct MCP tool wrapper for Claude Flow
async def adk_expert_mcp_tool(
    action: str,
    parameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    MCP tool wrapper for ADK Expert functionality.
    
    This allows Claude Flow to directly invoke ADK expert capabilities
    through the MCP tool interface.
    
    Args:
        action: The action to perform (query, validate, etc.)
        parameters: Parameters for the action
        
    Returns:
        Action results
    """
    if action == "query":
        flow = ADKExpertClaudeFlow()
        return await flow.process_adk_query(
            parameters.get("query", ""),
            parameters.get("context")
        )
    
    elif action == "validate":
        # Validation logic
        return {
            "status": "success",
            "validation": "Code validation against ADK patterns"
        }
    
    elif action == "list_patterns":
        # List available ADK patterns
        return {
            "patterns": [
                "two-phase-workflow",
                "hierarchical-planner-executor",
                "sequential-pipeline",
                "parallel-fan-out",
                "loop-with-escalation"
            ]
        }
    
    else:
        return {
            "status": "error",
            "message": f"Unknown action: {action}"
        }


if __name__ == "__main__":
    # Run examples
    print("ADK Expert Claude Flow Integration Examples\n")
    
    # Run basic query example
    asyncio.run(example_basic_query())
    
    # Show registration config
    print("\nRegistration Configuration:")
    print(json.dumps(register_with_claude_flow(), indent=2))