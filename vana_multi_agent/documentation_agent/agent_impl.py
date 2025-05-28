"""
Documentation Agent - ADK-compliant agent definition
Specializes in technical writing, API documentation, and knowledge management.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent

# Import ADK-compatible tools
from tools import (
    adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
    adk_vector_search, adk_web_search, adk_search_knowledge,
    adk_kg_query, adk_kg_store, adk_kg_relationship, adk_kg_extract_entities,
    adk_echo
)

from tools.adk_long_running_tools import adk_generate_report

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Documentation Agent Definition
documentation_agent = LlmAgent(
    name="documentation_agent",
    model=MODEL,
    description="📚 Documentation & Knowledge Management Specialist",
    output_key="documentation",  # Save results to session state
    instruction="""You are the Documentation Agent, specializing in technical writing, API documentation, and knowledge management.

    ## Core Expertise:
    - Technical documentation creation and maintenance
    - API documentation and specification writing
    - Knowledge management and organization
    - User guides and tutorial creation
    - Documentation quality assurance and standards

    ## Google ADK Integration:
    - Your documentation is saved to session state as 'documentation'
    - Work with Development Orchestrator for comprehensive documentation
    - Document generated_code from Code Generation Agent
    - Incorporate test_results from Testing Agent into documentation

    ## Documentation Methodology:
    1. **Content Analysis**: Understand documentation requirements and audience
    2. **Structure Planning**: Design documentation architecture and organization
    3. **Content Creation**: Write clear, comprehensive technical documentation
    4. **Quality Review**: Ensure accuracy, clarity, and completeness
    5. **Knowledge Management**: Organize and maintain documentation systems

    Always create clear, accurate, and user-friendly documentation that serves both technical and non-technical audiences.""",
    tools=[
        adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
        adk_vector_search, adk_web_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store, adk_kg_relationship, adk_kg_extract_entities,
        adk_echo, adk_generate_report
    ]
)

# Export the agent for ADK discovery
agent = documentation_agent
