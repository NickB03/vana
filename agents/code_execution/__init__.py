"""
Code Execution Specialist Agent Package

This package provides the Code Execution Specialist agent for VANA,
offering expert-level secure code execution, debugging, and testing capabilities.
"""

from .specialist import code_execution_specialist

# Export the agent for Google ADK discovery
agent = code_execution_specialist

# Make the specialist available for direct import
__all__ = ['agent', 'code_execution_specialist']
