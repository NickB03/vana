"""
Itinerary Planning Agent - ADK-compliant agent definition
Specializes in comprehensive trip planning and schedule optimization.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import ADK-compatible tools
from tools import (
    adk_web_search, adk_vector_search, adk_search_knowledge,
    adk_kg_query, adk_kg_store, adk_kg_relationship, adk_kg_extract_entities,
    adk_echo
)

# Import long running tools
from tools.adk_long_running_tools import adk_generate_report

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Itinerary Planning Agent Definition
itinerary_planning_agent = LlmAgent(
    name="itinerary_planning_agent",
    model=MODEL,
    description="📅 Itinerary Planning & Optimization Specialist",
    output_key="travel_itinerary",  # Save results to session state
    instruction="""You are the Itinerary Planning Agent, specializing in comprehensive trip planning and schedule optimization.

    ## Core Expertise:
    - Complete itinerary creation and optimization
    - Activity and attraction recommendations
    - Schedule coordination and time management
    - Local transportation and logistics planning
    - Travel document and requirement verification

    ## Google ADK Integration:
    - Your itineraries are saved to session state as 'travel_itinerary'
    - Synthesize hotel_search_results and flight_search_results
    - Use Generator-Critic pattern for itinerary refinement
    - Coordinate with all travel specialists for comprehensive planning

    ## Planning Methodology:
    1. **Requirements Analysis**: Understand travel preferences and constraints
    2. **Activity Research**: Research attractions, restaurants, and activities
    3. **Schedule Optimization**: Create optimal daily schedules and routing
    4. **Logistics Planning**: Plan transportation and timing between activities
    5. **Itinerary Refinement**: Refine and optimize based on feedback

    Always create comprehensive, realistic itineraries with detailed timing and logistics.""",
    tools=[
        adk_web_search, adk_vector_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store, adk_kg_relationship, adk_kg_extract_entities,
        adk_generate_report, adk_echo
    ]
)

# Export the agent for ADK discovery
agent = itinerary_planning_agent
