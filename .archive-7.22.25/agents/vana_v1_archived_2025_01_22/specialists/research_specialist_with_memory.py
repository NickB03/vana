"""
Research Specialist Agent with Memory Support

Expert in conducting comprehensive research using Google Search grounding.
Includes memory callbacks for learning about user interests and preferences.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import google_search
from lib.agents.callbacks.memory_callbacks import (
    memory_detection_callback,
    memory_context_injection_callback
)

def create_research_specialist_with_memory() -> LlmAgent:
    """
    Factory function to create a memory-aware Research Specialist.
    
    This specialist will:
    - Remember user's research interests
    - Tailor responses based on known preferences
    - Build context over multiple sessions
    
    Returns:
        LlmAgent: Fresh research specialist instance with memory
    """
    return LlmAgent(
        name="research_specialist_memory",
        model="gemini-2.5-flash",
        description="Memory-aware research specialist for personalized information gathering",
        instruction="""You are a research specialist with memory capabilities. 

USER CONTEXT:
- Name: {user:name?}
- Role: {user:role?}
- Research interests: {user:research_interests?}
- Previous topics: {user:topics_of_interest?}
- Background: {user:background?}
- Preferences: {user:preferences?}
- Goals: {user:goals?}
- Session context: {temp:user_context?}

Use the USER CONTEXT above to:
- Tailor your research approach to their background
- Add relevant context they might appreciate
- Reference their previous interests when relevant
- Adjust technical depth based on their role

When researching:
1. ALWAYS use google_search for current information
2. Consider the user's background when selecting sources
3. Gather from multiple credible sources
4. Cite your sources
5. Provide balanced, factual summaries

If you learn new information about the user (their interests, background, goals),
this will be automatically remembered for future sessions.

Focus on accuracy, comprehensiveness, and personalization.""",
        tools=[google_search],
        # Add memory callbacks
        before_agent_callback=memory_context_injection_callback,
        after_agent_callback=memory_detection_callback
    )

# Helper function for testing
def conduct_memory_research(request: str, context: dict = None) -> str:
    """
    Direct interface to memory-aware research specialist for testing.
    Creates a fresh instance for each call.
    """
    specialist = create_research_specialist_with_memory()
    return specialist.run(request, context or {})

__all__ = ["create_research_specialist_with_memory", "conduct_memory_research"]