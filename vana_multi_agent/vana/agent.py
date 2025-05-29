"""
VANA Multi-Agent System - Main Agent

This file contains the main VANA agent that integrates all specialist agents
and tools for comprehensive task execution.
"""

import sys
import os

# Add parent directory to path to import from agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the comprehensive VANA agent from agents/team.py
from agents.team import root_agent

# Export for ADK discovery
agent = root_agent
