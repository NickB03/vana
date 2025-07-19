"""
VANA Specialist Agent Pattern
Template for creating specialist agents in VANA
"""

from typing import Dict, List, Optional, Any
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool


def create_specialist_tool(tool_name: str) -> callable:
    """
    Factory for creating specialist-specific tools.
    
    Args:
        tool_name: Name of the tool to create
        
    Returns:
        Tool function
    """
    def tool_function(input_data: str) -> str:
        """Generic tool implementation."""
        return f"Processed {input_data} with {tool_name}"
    
    tool_function.__name__ = tool_name
    return tool_function


def create_specialist(
    name: str,
    specialty: str,
    tools: List[callable],
    model: str = "gemini-2.5-flash"
) -> LlmAgent:
    """
    Create a VANA specialist agent following standard patterns.
    
    Args:
        name: Agent identifier (e.g., "security_specialist")
        specialty: Domain of expertise
        tools: List of tool functions
        model: LLM model to use
        
    Returns:
        Configured specialist agent
    """
    instruction_template = f"""You are a {specialty} specialist in the VANA system.

CORE RESPONSIBILITIES:
1. Provide expert analysis in {specialty}
2. Use available tools effectively
3. Return structured, actionable insights
4. Maintain high quality standards

INTERACTION RULES:
- You receive requests from the orchestrator
- Focus only on your domain expertise
- Be concise but comprehensive
- Flag issues outside your domain

QUALITY STANDARDS:
- Accuracy is paramount
- Cite sources when applicable
- Explain reasoning clearly
- Suggest next steps

Remember: You are one part of a larger system. Do your part excellently."""

    return LlmAgent(
        name=name,
        model=model,
        description=f"Specialist agent for {specialty} tasks",
        instruction=instruction_template,
        tools=[FunctionTool(tool) for tool in tools]
    )


# Example specialist implementations

def create_security_specialist() -> LlmAgent:
    """Create security specialist with specific tools."""
    
    def scan_vulnerabilities(code: str) -> str:
        """Scan code for security vulnerabilities."""
        # Simplified implementation
        vulnerabilities = []
        if "eval(" in code:
            vulnerabilities.append("Dangerous eval() usage detected")
        if "password" in code and "plain" in code:
            vulnerabilities.append("Potential plaintext password storage")
        
        return f"Security scan complete. Found {len(vulnerabilities)} issues: {vulnerabilities}"
    
    def check_dependencies(requirements: str) -> str:
        """Check dependencies for known vulnerabilities."""
        return "Dependency scan complete. All dependencies appear secure."
    
    return create_specialist(
        name="security_specialist",
        specialty="security analysis and vulnerability detection",
        tools=[scan_vulnerabilities, check_dependencies]
    )


def create_architecture_specialist() -> LlmAgent:
    """Create architecture specialist with specific tools."""
    
    def analyze_structure(codebase_path: str) -> str:
        """Analyze codebase structure and patterns."""
        return f"Architecture analysis of {codebase_path}: Well-structured with clear separation of concerns."
    
    def suggest_patterns(requirements: str) -> str:
        """Suggest design patterns for requirements."""
        return "Recommended patterns: Repository pattern for data access, Strategy pattern for algorithms."
    
    return create_specialist(
        name="architecture_specialist",
        specialty="software architecture and design patterns",
        tools=[analyze_structure, suggest_patterns]
    )


def create_data_science_specialist() -> LlmAgent:
    """Create data science specialist with specific tools."""
    
    def analyze_data(data_description: str) -> str:
        """Analyze data and provide insights."""
        return f"Data analysis for {data_description}: Key patterns identified, recommend further investigation."
    
    def generate_visualization(data: str, viz_type: str) -> str:
        """Generate visualization recommendations."""
        return f"Recommended {viz_type} visualization with following configuration: axes, colors, labels."
    
    return create_specialist(
        name="data_science_specialist",
        specialty="data analysis and machine learning",
        tools=[analyze_data, generate_visualization]
    )


# Specialist registration pattern
class SpecialistRegistry:
    """Registry for managing specialist agents."""
    
    def __init__(self):
        self.specialists = {}
    
    def register(self, specialist: LlmAgent):
        """Register a specialist agent."""
        self.specialists[specialist.name] = specialist
    
    def get(self, name: str) -> Optional[LlmAgent]:
        """Get specialist by name."""
        return self.specialists.get(name)
    
    def list_specialists(self) -> List[str]:
        """List all registered specialists."""
        return list(self.specialists.keys())


# Example usage
if __name__ == "__main__":
    # Create specialists
    security = create_security_specialist()
    architecture = create_architecture_specialist()
    data_science = create_data_science_specialist()
    
    # Register specialists
    registry = SpecialistRegistry()
    registry.register(security)
    registry.register(architecture)
    registry.register(data_science)
    
    print(f"Registered specialists: {registry.list_specialists()}")