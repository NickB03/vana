# EMERGENCY FIX: Import core tools needed by agent (avoiding problematic imports)

# Import search tools separately to avoid hanging imports
try:
    from .adk_tools import adk_search_knowledge, adk_vector_search, adk_web_search
except ImportError as e:
    print(f"Warning: Could not import search tools: {e}")
    # Create placeholder tools
    from google.adk.tools import FunctionTool

    def placeholder_search(query: str) -> str:
        return f"Search temporarily unavailable: {query}"

    adk_vector_search = FunctionTool(func=placeholder_search)
    adk_vector_search.name = "vector_search"
    adk_web_search = FunctionTool(func=placeholder_search)
    adk_web_search.name = "web_search"
    adk_search_knowledge = FunctionTool(func=placeholder_search)
    adk_search_knowledge.name = "search_knowledge"
