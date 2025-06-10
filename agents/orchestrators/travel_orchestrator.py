from google.adk.agents import SequentialAgent, LlmAgent
from google.adk.tools import FunctionTool

from lib._tools.orchestrated_specialist_tools import (
    itinerary_planning_tool,
    hotel_search_tool,
    flight_search_tool,
    payment_processing_tool,
)


def create_travel_orchestrator() -> SequentialAgent:
    """Create orchestrator for travel related tasks."""

    itinerary_agent = LlmAgent(
        name="ItineraryPlanner",
        model="gemini-2.0-flash",
        instruction=(
            "Plan detailed travel itineraries using itinerary_planning_tool."
        ),
        tools=[FunctionTool(itinerary_planning_tool)],
        output_key="draft",
    )

    hotel_agent = LlmAgent(
        name="HotelFinder",
        model="gemini-2.0-flash",
        instruction="Search for accommodations using hotel_search_tool.",
        tools=[FunctionTool(hotel_search_tool)],
        output_key="hotel_options",
    )

    flight_agent = LlmAgent(
        name="FlightFinder",
        model="gemini-2.0-flash",
        instruction="Find flights using flight_search_tool.",
        tools=[FunctionTool(flight_search_tool)],
        output_key="flight_options",
    )

    payment_agent = LlmAgent(
        name="BookingAssistant",
        model="gemini-2.0-flash",
        instruction="Handle bookings using payment_processing_tool.",
        tools=[FunctionTool(payment_processing_tool)],
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
