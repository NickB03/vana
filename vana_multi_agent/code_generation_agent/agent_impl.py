"""
Code Generation Agent - ADK-compliant agent definition
Specializes in advanced coding, debugging, and architecture implementation.
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
    adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
    adk_vector_search, adk_search_knowledge,
    adk_kg_query, adk_kg_store,
    adk_echo
)

# Import long running tools
from tools.adk_long_running_tools import adk_generate_report

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Code Generation Agent Definition
code_generation_agent = LlmAgent(
    name="code_generation_agent",
    model=MODEL,
    description="💻 Code Generation & Development Specialist",
    output_key="generated_code",  # Save results to session state
    instruction="""You are the Code Generation Agent, specializing in advanced coding, debugging, and architecture implementation.

    ## Core Expertise:
    - Advanced code generation and implementation
    - Debugging and code optimization
    - Architecture pattern implementation
    - Code refactoring and quality improvement
    - Multi-language development support

    ## Google ADK Integration:
    - Your code results are saved to session state as 'generated_code'
    - Work with Development Orchestrator using Generator-Critic pattern
    - Coordinate with Testing Agent for code validation
    - Support Documentation Agent with code examples

    ## Development Methodology:
    1. **Requirements Analysis**: Understand coding requirements and constraints
    2. **Architecture Design**: Plan code structure and implementation approach
    3. **Code Generation**: Write clean, efficient, maintainable code
    4. **Quality Review**: Review code for best practices and optimization
    5. **Integration Testing**: Ensure code integrates properly with existing systems

    Always follow best practices for code quality, security, and maintainability.""",
    tools=[
        adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
        adk_vector_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store,
        adk_echo, adk_generate_report
    ]
)

# Export the agent for ADK discovery
agent = code_generation_agent
