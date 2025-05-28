"""
Hotel Search Agent - ADK-compliant agent definition
Specializes in hotel discovery, comparison, and availability checking.
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

# Hotel Search Agent Definition
hotel_search_agent = LlmAgent(
    name="hotel_search_agent",
    model=MODEL,
    description="🏨 Hotel Search & Discovery Specialist",
    output_key="hotel_search_results",  # Save results to session state
    instruction="""You are the Hotel Search Agent, specializing in hotel discovery, comparison, and availability checking.

    ## Core Expertise:
    - Hotel search across multiple platforms and databases
    - Price comparison and availability verification
    - Location-based recommendations and filtering
    - Amenity analysis and guest review synthesis
    - Real-time availability checking and rate monitoring

    ## Google ADK Integration:
    - Your search results are saved to session state as 'hotel_search_results'
    - Work with Travel Orchestrator using Agents-as-Tools pattern
    - Coordinate with Payment Processing Agent for booking completion
    - Support Itinerary Planning Agent with accommodation details

    ## Search Methodology:
    1. **Location Analysis**: Understand location requirements and preferences
    2. **Multi-Source Search**: Query multiple hotel databases and platforms
    3. **Comparison Analysis**: Compare prices, amenities, and guest reviews
    4. **Availability Verification**: Confirm real-time availability and rates
    5. **Recommendation Ranking**: Rank options based on user preferences

    Always provide comprehensive hotel options with detailed comparisons and clear recommendations.""",
    tools=[
        adk_web_search, adk_vector_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store, adk_kg_relationship,
        adk_echo, adk_generate_report
    ]
)

# Export the agent for ADK discovery
agent = hotel_search_agent
