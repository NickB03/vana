from google.adk import FunctionTool
from .ragie_client import query_memory, format_memory_results

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
    results = query_memory(query, top_k=top_k)
    return format_memory_results(results)

# Create the memory tool for use in ADK agents
memory_tool = FunctionTool(
    name="search_memory",
    description="Search the agent's memory for relevant information about the project",
    fn=search_memory_tool,
)

# Function to add memory tools to an agent's toolset
def add_memory_tools_to_agent(agent_class):
    """
    Adds memory tools to an ADK agent class
    
    Args:
        agent_class: The ADK agent class to augment with memory tools
        
    Returns:
        Updated agent class with memory tools added
    """
    if not hasattr(agent_class, 'tools'):
        agent_class.tools = []
    
    # Add the memory tool if it's not already present
    if memory_tool not in agent_class.tools:
        agent_class.tools.append(memory_tool)
    
    return agent_class
