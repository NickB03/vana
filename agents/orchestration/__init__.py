# Orchestration agent placeholder - redirects to VANA
# Avoid circular import by using lazy loading

def get_root_agent():
    """Lazy load root_agent to avoid circular imports."""
    from agents.vana.team import root_agent
    return root_agent

# Create a proxy agent that delegates to root_agent
class OrchestrationAgentProxy:
    """Proxy agent that delegates to the root VANA agent."""

    def __getattr__(self, name):
        return getattr(get_root_agent(), name)

# Export proxy agent for ADK discovery
agent = OrchestrationAgentProxy()

# Function to get root_agent for backward compatibility
def get_agent():
    """Get the root agent instance."""
    return get_root_agent()

# Ensure agent is available at module level
__all__ = ["agent", "get_agent"]
