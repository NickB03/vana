"""
Code Execution Specialist Agent

Provides secure code execution capabilities across multiple programming languages
using the VANA sandbox environment with comprehensive security and monitoring.
"""

from .specialist import root_agent

# Export the root agent for ADK discovery
__all__ = ["root_agent"]
