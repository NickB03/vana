# Specialists agent placeholder - redirects to VANA
# Avoid circular import by using lazy loading


def get_root_agent():
    """Lazy load root_agent to avoid circular imports."""
    from agents.base_agents import get_root_agent as get_base_root_agent

    # Try to get from base module first
    agent = get_base_root_agent()
    if agent is None:
        # Fallback to importing directly (will trigger initialization)
        from agents.vana.team import root_agent

        agent = root_agent

    return agent


# Create a proxy agent that delegates to root_agent
class SpecialistAgentProxy:
    """Proxy agent that delegates to the root VANA agent."""

    def __getattr__(self, name):
        return getattr(get_root_agent(), name)


# Export proxy agent for ADK discovery
agent = SpecialistAgentProxy()

# ADK expects root_agent specifically
root_agent = SpecialistAgentProxy()


# Function to get root_agent for backward compatibility
def get_agent():
    """Get the root agent instance."""
    return get_root_agent()


# Import specialist agents
try:
    from .architecture_specialist import architecture_specialist, architecture_specialist_tool
except ImportError:
    # Handle gracefully if specialists not yet implemented
    architecture_specialist = None
    architecture_specialist_tool = None

try:
    from .data_science_specialist import data_science_specialist, data_science_specialist_tool
except ImportError:
    data_science_specialist = None
    data_science_specialist_tool = None

try:
    from .security_specialist import security_specialist, security_specialist_tool
except ImportError:
    security_specialist = None
    security_specialist_tool = None

try:
    from .devops_specialist import devops_specialist, devops_specialist_tool
except ImportError:
    devops_specialist = None
    devops_specialist_tool = None


# Ensure agent is available at module level
__all__ = [
    "agent",
    "get_agent",
    "root_agent",
    "architecture_specialist",
    "architecture_specialist_tool",
    "data_science_specialist",
    "data_science_specialist_tool",
    "security_specialist",
    "security_specialist_tool",
    "devops_specialist",
    "devops_specialist_tool",
]
