"""
VANA Agent Pattern Example
Shows the standard pattern for creating ADK-compliant agents in VANA
"""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Example tool function
def analyze_code(code_snippet: str) -> str:
    """Analyze a code snippet for quality and patterns."""
    # Tool implementation
    return f"Analysis of {len(code_snippet)} characters of code..."

# Example agent following VANA patterns
example_specialist = LlmAgent(
    name="example_specialist",
    model="gemini-2.5-flash",  # VANA standard model
    description="Example specialist agent following VANA patterns",
    instruction="""You are an example specialist demonstrating VANA patterns.
    
    Key principles:
    1. Clear, focused responsibility
    2. Use tools for complex operations
    3. Return structured, useful responses
    4. Follow ADK patterns
    
    When analyzing code:
    - Use the analyze_code tool
    - Provide actionable insights
    - Follow VANA coding standards
    """,
    tools=[
        FunctionTool(analyze_code),
        # Add more tools as needed
    ],
)

# Example of agent with sub-agents (orchestrator pattern)
example_orchestrator = LlmAgent(
    name="example_orchestrator",
    model="gemini-2.5-flash",
    description="Example orchestrator with specialist delegation",
    instruction="""You are an orchestrator that delegates to specialists.
    
    CRITICAL: You receive all requests and must:
    1. Analyze the request
    2. Delegate to appropriate sub-agents
    3. Return comprehensive responses
    
    Never transfer back to the caller - you ARE the orchestrator.
    """,
    tools=[
        # Orchestrator typically has analysis and routing tools
    ],
    sub_agents=[
        example_specialist,
        # Add more specialists as needed
    ],
)

# Usage pattern in VANA
if __name__ == "__main__":
    # This would typically be integrated into the VANA system
    # through agents/vana/team.py or similar
    print("Example VANA agent patterns loaded")