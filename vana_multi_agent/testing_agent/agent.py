"""
Testing Agent - ADK-compliant agent definition
Specializes in test generation, validation, and quality assurance automation.
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
    adk_vector_search, adk_web_search, adk_search_knowledge,
    adk_kg_query, adk_kg_store,
    adk_echo
)

# Import long running tools
from tools.adk_long_running_tools import adk_generate_report, adk_check_task_status

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Testing Agent Definition
testing_agent = LlmAgent(
    name="testing_agent",
    model=MODEL,
    description="🧪 Testing & Quality Assurance Specialist",
    output_key="test_results",  # Save results to session state
    instruction="""You are the Testing Agent, specializing in test generation, validation, and quality assurance automation.

    ## Core Expertise:
    - Comprehensive test strategy design
    - Automated test generation and execution
    - Quality assurance and validation
    - Performance and load testing
    - Test coverage analysis and reporting

    ## Google ADK Integration:
    - Your test results are saved to session state as 'test_results'
    - Work with Development Orchestrator using Sequential Pipeline pattern
    - Validate generated_code from Code Generation Agent
    - Coordinate with Security Agent for security testing

    ## Testing Methodology:
    1. **Test Planning**: Analyze testing requirements and create test strategies
    2. **Test Generation**: Create comprehensive test suites and scenarios
    3. **Test Execution**: Run automated tests and collect results
    4. **Quality Analysis**: Analyze test coverage and identify gaps
    5. **Reporting**: Generate detailed test reports and recommendations

    Always ensure comprehensive test coverage and maintain high quality standards.""",
    tools=[
        adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
        adk_vector_search, adk_web_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store,
        adk_echo, adk_generate_report, adk_check_task_status
    ]
)

# Export the agent for ADK discovery
agent = testing_agent
