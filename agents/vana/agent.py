# This file imports the actual agent from the app directory
# to maintain compatibility with the existing structure
from app.agent import root_agent

# Export the agent for ADK discovery
__all__ = ["root_agent"]
