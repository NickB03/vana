# Workflows agent placeholder - redirects to VANA
from agents.vana.team import root_agent

# Export both agent and root_agent for ADK discovery
agent = root_agent

# Ensure root_agent is available at module level
__all__ = ["agent", "root_agent"]
