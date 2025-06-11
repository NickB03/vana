"""
Data Science Specialist Agent Package

This package provides the Data Science Specialist agent for VANA,
offering expert-level data analysis, machine learning, and statistical modeling capabilities.
"""

from .specialist import data_science_specialist

# Export the agent for Google ADK discovery
agent = data_science_specialist

# Make the specialist available for direct import
__all__ = ['agent', 'data_science_specialist']
