"""
Code Execution Specialist Agent

Provides secure code execution capabilities across multiple programming languages
using the VANA sandbox environment with comprehensive security and monitoring.
"""

from .specialist import code_execution_specialist

# Export the root agent for ADK discovery
root_agent = code_execution_specialist

__all__ = ["code_execution_specialist", "root_agent"]
