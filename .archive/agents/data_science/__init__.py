"""
Data Science Specialist Agent

Provides comprehensive data analysis, visualization, and machine learning capabilities
by leveraging the Code Execution Specialist for secure Python execution.
"""

from .specialist import data_science_specialist

# Export the root agent for ADK discovery
root_agent = data_science_specialist

__all__ = ["data_science_specialist", "root_agent"]
