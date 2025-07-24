# ADK Standard agent.py file for evaluation and deployment
"""
This module exports the root_agent for ADK evaluation and deployment.
Following ADK standards as documented in:
https://google.github.io/adk-docs/deploy/cloud-run/
"""

# Use memory-enabled orchestrator for cross-session persistence
from .orchestrator_with_memory import orchestrator_memory

# ADK expects the agent to be named 'root_agent'
root_agent = orchestrator_memory

# Note: To use the standard orchestrator without memory:
# from .orchestrator_pure_delegation import orchestrator_pure
# root_agent = orchestrator_pure

# Note: For simplified testing, use the MVP orchestrator:
# from .mvp_orchestrator import mvp_orchestrator
# root_agent = mvp_orchestrator