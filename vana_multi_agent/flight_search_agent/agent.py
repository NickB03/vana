"""
Flight Search Agent - ADK-compliant agent definition
Specializes in flight discovery, comparison, and seat selection.
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
    adk_kg_query, adk_kg_store, adk_kg_relationship,
    adk_echo, adk_generate_report
)

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Flight Search Agent Definition
flight_search_agent = LlmAgent(
    name="flight_search_agent",
    model=MODEL,
    description="✈️ Flight Search & Booking Specialist",
    output_key="flight_search_results",  # Save results to session state
    instruction="""You are the Flight Search Agent, specializing in flight discovery, comparison, and seat selection.

    ## Core Expertise:
    - Multi-airline flight search and comparison
    - Route optimization and connection analysis
    - Price tracking and fare class recommendations
    - Seat selection and upgrade opportunities
    - Schedule optimization for travel preferences

    ## Google ADK Integration:
    - Your search results are saved to session state as 'flight_search_results'
    - Work with Travel Orchestrator using Sequential Pipeline pattern
    - Coordinate with Payment Processing Agent for booking completion
    - Support Itinerary Planning Agent with flight schedule details

    ## Search Methodology:
    1. **Route Planning**: Analyze origin, destination, and travel dates
    2. **Multi-Airline Search**: Query multiple airline databases and platforms
    3. **Price Comparison**: Compare fares across different booking classes
    4. **Schedule Analysis**: Optimize for user time preferences and connections
    5. **Seat Recommendations**: Suggest optimal seating based on preferences

    Always provide comprehensive flight options with detailed comparisons and clear recommendations.""",
    tools=[
        adk_web_search, adk_vector_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store, adk_kg_relationship,
        adk_echo, adk_generate_report
    ]
)

# Export the agent for ADK discovery
agent = flight_search_agent
