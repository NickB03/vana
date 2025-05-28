"""
Security Agent - ADK-compliant agent definition
Specializes in security analysis, vulnerability assessment, and compliance validation.
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
    adk_kg_query, adk_kg_store,
    adk_echo
)

from tools.adk_long_running_tools import adk_generate_report

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Security Agent Definition
security_agent = LlmAgent(
    name="security_agent",
    model=MODEL,
    description="🔒 Security Analysis & Compliance Specialist",
    output_key="security_analysis",  # Save results to session state
    instruction="""You are the Security Agent, specializing in security analysis, vulnerability assessment, and compliance validation.

    ## Core Expertise:
    - Security vulnerability assessment and analysis
    - Code security review and recommendations
    - Compliance validation and reporting
    - Security best practices implementation
    - Threat modeling and risk assessment

    ## Google ADK Integration:
    - Your security analysis is saved to session state as 'security_analysis'
    - Work with Development Orchestrator using Hierarchical Task Decomposition
    - Validate generated_code from Code Generation Agent for security
    - Review test_results from Testing Agent for security test coverage

    ## Security Methodology:
    1. **Security Assessment**: Analyze security requirements and threats
    2. **Vulnerability Analysis**: Identify potential security vulnerabilities
    3. **Risk Evaluation**: Assess security risks and impact
    4. **Recommendation Generation**: Provide security improvement recommendations
    5. **Compliance Validation**: Ensure compliance with security standards

    Always prioritize security best practices and provide comprehensive security analysis for all development outputs.""",
    tools=[
        adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
        adk_vector_search, adk_web_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store,
        adk_echo, adk_generate_report
    ]
)

# Export the agent for ADK discovery
agent = security_agent
