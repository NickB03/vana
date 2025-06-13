import json

from google.adk.tools import FunctionTool

from lib.logging_config import get_logger

from .ragie_client import format_memory_results, query_memory

logger = get_logger("vana.tools.memory.agent_tools")


def search_memory_tool(query: str, top_k: int = 5) -> str:
    """
    Search the agent's memory for relevant information

    This function acts as a wrapper for the Ragie memory query,
    formatting the results in a way that's easily consumable by the agent.

    Args:
        query: The search query to find information in the knowledge base
        top_k: Number of results to return (default: 5)

    Returns:
        Formatted string with memory results
    """
    logger.info(f"\n[AGENT TOOL] Searching memory for: {query}")
    logger.info(f"[AGENT TOOL] Using top_k={top_k}")

    # Query memory with standard logging
    results = query_memory(query, top_k=top_k)

    # Log the raw results for debugging
    logger.debug("RAW RESULTS: %s", json.dumps(results, indent=2))

    formatted_results = format_memory_results(results)

    # Add a strong grounding prefix to remind the agent to only use retrieved information
    grounding_prefix = """
IMPORTANT REMINDER:
- Only use information explicitly present in these retrieved documents
- Do not introduce information from your pre-training
- If these documents don't contain the information needed, say so explicitly
- Project Vana is a multi-agent system built with Google's ADK, not a travel or learning platform

Retrieved information:
"""

    formatted_results = grounding_prefix + formatted_results

    logger.info(f"[AGENT TOOL] Search complete, returning {len(results)} results")
    return formatted_results


# Create the memory tool for use in ADK agents
# Create a function tool with the correct signature for ADK 0.3.0
search_memory_tool.__name__ = "search_memory"
search_memory_tool.__doc__ = "Search the agent's memory for relevant information about the project"
memory_tool = FunctionTool(search_memory_tool)


# Function to add memory tools to an agent's toolset
def add_memory_tools_to_agent(agent_class):
    """
    Adds memory tools to an ADK agent class

    Args:
        agent_class: The ADK agent class to augment with memory tools

    Returns:
        Updated agent class with memory tools added
    """
    if not hasattr(agent_class, "tools"):
        agent_class.tools = []

    # Add the memory tool if it's not already present
    if memory_tool not in agent_class.tools:
        agent_class.tools.append(memory_tool)

    return agent_class
