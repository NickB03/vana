# ADK Standard agent.py file for evaluation and deployment
"""
This module exports the root_agent for ADK evaluation and deployment.
Following ADK standards as documented in:
https://google.github.io/adk-docs/deploy/cloud-run/
"""

# For ADK evaluation, use the enhanced orchestrator
from .enhanced_orchestrator import enhanced_orchestrator

# ADK expects the agent to be named 'root_agent'
root_agent = enhanced_orchestrator

# Note: For simplified testing, use the MVP orchestrator:
# from .mvp_orchestrator import mvp_orchestrator
# root_agent = mvp_orchestrator