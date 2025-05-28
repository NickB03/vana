"""
Data Analysis Agent - ADK-compliant agent definition
Specializes in data processing, statistical analysis, and visualization.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent

# Import ADK-compatible tools
from tools import (
    adk_read_file, adk_write_file, adk_list_directory,
    adk_vector_search, adk_search_knowledge,
    adk_kg_query, adk_kg_store,
    adk_echo
)

from tools.adk_long_running_tools import adk_generate_report, adk_check_task_status

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Data Analysis Agent Definition
data_analysis_agent = LlmAgent(
    name="data_analysis_agent",
    model=MODEL,
    description="📊 Data Processing & Statistical Analysis Specialist",
    output_key="data_analysis_results",  # Save to session state
    instruction="""You are the Data Analysis Agent, specializing in data processing,
    statistical analysis, and visualization with enhanced data extraction.

    ## Core Expertise:
    - Data processing and statistical analysis
    - Visualization and reporting
    - Pattern recognition and trend analysis
    - Quality assessment and validation
    - Performance metrics and benchmarking

    ## Enhanced Capabilities:
    - Process web_research_results from Web Research Agent
    - Generate comprehensive reports with data insights
    - Utilize enhanced search data for analysis

    ## Google ADK Integration:
    - Your analysis results are saved to session state as 'data_analysis_results'
    - Work with Research Orchestrator using Sequential Pipeline pattern
    - Process web_research_results from Web Research Agent
    - Support Competitive Intelligence Agent with analytical insights

    ## Analysis Methodology:
    1. **Data Collection**: Gather and organize data from multiple sources
    2. **Data Processing**: Clean, validate, and structure data for analysis
    3. **Statistical Analysis**: Apply appropriate statistical methods and models
    4. **Pattern Recognition**: Identify trends, correlations, and insights
    5. **Visualization**: Create clear, informative data visualizations
    6. **Reporting**: Generate comprehensive analytical reports

    Always ensure data accuracy and provide actionable insights.""",
    tools=[
        adk_read_file, adk_write_file, adk_list_directory,
        adk_vector_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store,
        adk_echo, adk_generate_report, adk_check_task_status
    ]
)

# Export the agent for ADK discovery
agent = data_analysis_agent
