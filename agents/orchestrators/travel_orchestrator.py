from google.adk.agents import SequentialAgent, LlmAgent
from google.adk.tools import FunctionTool
import os

from lib._tools.tool_wrappers import safe_tool

from lib._tools.orchestrated_specialist_tools import (
    itinerary_planning_tool,
    hotel_search_tool,
    flight_search_tool,
    payment_processing_tool,
)


MODEL_NAME = os.getenv("VANA_MODEL_NAME", "gemini-2.0-flash")


def create_travel_orchestrator() -> SequentialAgent:
    """Create orchestrator for travel related tasks."""

    itinerary_agent = LlmAgent(
        name="ItineraryPlanner",
        model=MODEL_NAME,
        instruction=(
            "Plan detailed travel itineraries using itinerary_planning_tool."
        ),
        tools=[FunctionTool(safe_tool(itinerary_planning_tool))],
        output_key="draft",
    )

    hotel_agent = LlmAgent(
        name="HotelFinder",
        model=MODEL_NAME,
        instruction="Search for accommodations using hotel_search_tool.",
        tools=[FunctionTool(safe_tool(hotel_search_tool))],
        output_key="hotel_options",
    )

    flight_agent = LlmAgent(
        name="FlightFinder",
        model=MODEL_NAME,
        instruction="Find flights using flight_search_tool.",
        tools=[FunctionTool(safe_tool(flight_search_tool))],
        output_key="flight_options",
    )

    payment_agent = LlmAgent(
        name="BookingAssistant",
        model=MODEL_NAME,
        instruction="Handle bookings using payment_processing_tool.",
        tools=[FunctionTool(safe_tool(payment_processing_tool))],
        output_key="booking_confirmation",
    )

    return SequentialAgent(
        name="TravelOrchestrator",
        description="Coordinates travel planning and booking specialists",
        sub_agents=[
            itinerary_agent,
            hotel_agent,
            flight_agent,
            payment_agent,
        ],
    )


travel_orchestrator = create_travel_orchestrator()

__all__ = ["create_travel_orchestrator", "travel_orchestrator"]
