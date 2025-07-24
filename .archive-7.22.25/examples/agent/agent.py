"""
VANA Agent Creation Pattern
Demonstrates the standard patterns for creating agents in VANA using ADK
"""

from typing import List, Dict, Any, Optional
from google.adk.agents import LlmAgent, SequentialAgent, LoopAgent
from google.adk.tools import FunctionTool, google_search
from google.adk.sessions import InMemorySessionService


# Pattern 1: Basic Agent Creation
def create_basic_agent() -> LlmAgent:
    """Minimal agent creation pattern."""
    return LlmAgent(
        name="basic_agent",
        model="gemini-2.5-flash",
        description="A basic VANA agent",
        instruction="You are a helpful AI assistant. Provide clear, concise responses."
    )


# Pattern 2: Agent with Tools
def create_agent_with_tools() -> LlmAgent:
    """Agent with integrated tools pattern."""
    
    def custom_tool(input_text: str) -> str:
        """Example custom tool."""
        return f"Processed: {input_text}"
    
    return LlmAgent(
        name="tool_agent",
        model="gemini-2.5-flash",
        description="Agent with tool capabilities",
        instruction="""You have access to tools. Use them when appropriate:
        - custom_tool: For processing text
        - google_search: For web searches
        
        Always explain what tools you're using and why.""",
        tools=[
            FunctionTool(custom_tool),
            google_search
        ]
    )


# Pattern 3: Hierarchical Agent Structure (VANA Pattern)
def create_vana_agent_hierarchy() -> LlmAgent:
    """VANA's hierarchical agent pattern with orchestrator and specialists."""
    
    # Create specialist agents
    security_specialist = LlmAgent(
        name="security_specialist",
        model="gemini-2.5-flash",
        description="Security analysis specialist",
        instruction="""You are a security specialist. Focus on:
        - Vulnerability detection
        - Security best practices
        - Threat analysis
        Return structured security findings."""
    )
    
    architecture_specialist = LlmAgent(
        name="architecture_specialist",
        model="gemini-2.5-flash",
        description="Architecture review specialist",
        instruction="""You are an architecture specialist. Focus on:
        - Design patterns
        - Code structure
        - Scalability concerns
        Return architectural recommendations."""
    )
    
    # Create orchestrator
    orchestrator = LlmAgent(
        name="orchestrator",
        model="gemini-2.5-flash",
        description="Central orchestrator for specialist routing",
        instruction="""You orchestrate specialist agents. Your job:
        1. Analyze incoming requests
        2. Route to appropriate specialists
        3. Synthesize responses
        
        ROUTING:
        - Security concerns → security_specialist
        - Design/Architecture → architecture_specialist
        
        NEVER transfer back to parent agent.""",
        sub_agents=[security_specialist, architecture_specialist]
    )
    
    # Create root agent (entry point)
    root_agent = LlmAgent(
        name="vana",
        model="gemini-2.5-flash",
        description="VANA root agent - entry point",
        instruction="""You are VANA's entry point. 
        IMMEDIATELY transfer all requests to the orchestrator.
        Do not generate responses yourself.""",
        sub_agents=[orchestrator]
    )
    
    return root_agent


# Pattern 4: Sequential Workflow Agent
def create_sequential_workflow() -> SequentialAgent:
    """Sequential processing pattern for multi-step workflows."""
    
    # Step 1: Validator
    validator = LlmAgent(
        name="validator",
        model="gemini-2.5-flash",
        description="Validates input data",
        instruction="Validate the input. Output 'valid' or 'invalid' with reason."
    )
    
    # Step 2: Processor
    processor = LlmAgent(
        name="processor",
        model="gemini-2.5-flash",
        description="Processes validated data",
        instruction="Process the validated input. Transform it according to requirements."
    )
    
    # Step 3: Reporter
    reporter = LlmAgent(
        name="reporter",
        model="gemini-2.5-flash",
        description="Generates final report",
        instruction="Create a formatted report from processed data."
    )
    
    # Create sequential pipeline
    return SequentialAgent(
        agents=[validator, processor, reporter],
        output_key="workflow_result"
    )


# Pattern 5: Loop Agent for Iterative Refinement
def create_loop_agent() -> LoopAgent:
    """Loop pattern for iterative improvement."""
    
    def should_continue(request, response) -> bool:
        """Determine if loop should continue."""
        # Check if quality criteria met
        quality_score = response.data.get("quality_score", 0)
        return quality_score < 8  # Continue if below threshold
    
    refiner = LlmAgent(
        name="refiner",
        model="gemini-2.5-flash",
        description="Iteratively refines content",
        instruction="""Refine the content to improve quality.
        Rate quality 1-10 and provide improved version.
        Output format: {"quality_score": X, "refined_content": "..."}"""
    )
    
    return LoopAgent(
        agent=refiner,
        max_iterations=5,
        continuation_condition=should_continue
    )


# Pattern 6: Stateful Agent with Session Management
class StatefulAgentPattern:
    """Pattern for agents with persistent state."""
    
    def __init__(self):
        self.session_service = InMemorySessionService()
        self.agent = self._create_agent()
    
    def _create_agent(self) -> LlmAgent:
        """Create agent with state awareness."""
        return LlmAgent(
            name="stateful_agent",
            model="gemini-2.5-flash",
            description="Agent with session state",
            instruction="""You have access to session state containing:
            - user_preferences
            - conversation_history
            - task_context
            
            Use this information to provide personalized responses.
            Update state when learning new information."""
        )
    
    def initialize_session(self, user_id: str) -> str:
        """Initialize a new session with default state."""
        session_id = f"session_{user_id}_{hash(user_id)}"
        
        initial_state = {
            "user_preferences": {},
            "conversation_history": [],
            "task_context": {}
        }
        
        self.session_service.create_session(
            app_name="vana",
            user_id=user_id,
            session_id=session_id,
            state=initial_state
        )
        
        return session_id
    
    def run_with_state(self, request: str, session_id: str) -> str:
        """Run agent with session state."""
        # Agent automatically has access to session state
        # through the runner context
        return f"Processed with session: {session_id}"


# Pattern 7: Error Handling in Agents
def create_robust_agent() -> LlmAgent:
    """Agent with comprehensive error handling."""
    
    def safe_tool(input_data: str) -> str:
        """Tool with error handling."""
        try:
            # Tool logic here
            if not input_data:
                raise ValueError("Empty input")
            return f"Processed: {input_data}"
        except Exception as e:
            return f"Error in tool: {str(e)}"
    
    return LlmAgent(
        name="robust_agent",
        model="gemini-2.5-flash",
        description="Agent with error handling",
        instruction="""Handle errors gracefully:
        1. If a tool fails, explain the issue
        2. Provide alternative approaches
        3. Never expose internal errors to users
        4. Always maintain helpful tone
        
        Example responses:
        - "I encountered an issue with that request. Let me try another approach..."
        - "That operation isn't available right now, but I can help you with..."
        """,
        tools=[FunctionTool(safe_tool)]
    )


# Example usage and best practices
if __name__ == "__main__":
    print("VANA Agent Patterns:")
    print("1. Basic Agent - Minimal setup")
    print("2. Agent with Tools - Tool integration")
    print("3. Hierarchical Agents - VANA's orchestrator pattern")
    print("4. Sequential Workflow - Multi-step processing")
    print("5. Loop Agent - Iterative refinement")
    print("6. Stateful Agent - Session management")
    print("7. Robust Agent - Error handling")
    
    # Example: Create VANA hierarchy
    vana_system = create_vana_agent_hierarchy()
    print(f"\nCreated VANA system with root agent: {vana_system.name}")