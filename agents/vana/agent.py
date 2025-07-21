# ADK Standard agent.py file for evaluation and deployment
"""
This module exports the root_agent for ADK evaluation and deployment.
Following ADK standards as documented in:
https://google.github.io/adk-docs/deploy/cloud-run/
"""

# Use pure delegation pattern with separate simple search agent
# Reference: https://github.com/google/adk-python/issues/53
from .orchestrator_pure_delegation import orchestrator_pure

# ADK expects the agent to be named 'root_agent'
root_agent = orchestrator_pure

# Note: For simplified testing, use the MVP orchestrator:
# from .mvp_orchestrator import mvp_orchestrator
# root_agent = mvp_orchestrator